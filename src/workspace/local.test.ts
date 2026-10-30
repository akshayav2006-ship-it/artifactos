import { expect, test } from "vitest";
import { localActions } from "./local";
import { emptyData } from "../../shared/workspace";
test("multiple local commits are independent and only pushed commits become artifacts", async () => {
  let data = structuredClone(emptyData);
  const a = localActions(
    () => data,
    (next) => {
      data = next;
    },
  );
  const project = await a.createProject("Research", "A description");
  const chat = await a.createChat("", "New chat");
  await a.sendPrompt(chat, "Explore ideas");
  await a.assignChat(chat, project);
  const prompt = data.prompts[0];
  await a.addResult(prompt.id, "First result");
  await a.commit(chat, prompt.id, "Draft A", "First result", "Initial draft");
  await a.commit(chat, prompt.id, "Draft B", "Better result", "Refinement");
  expect(data.artifacts).toHaveLength(0);
  await expect(a.push(data.commits[1].id)).rejects.toThrow("final version");
  await a.selectFinal(data.commits[1].id);
  await a.push(data.commits[1].id);
  expect(data.artifacts).toHaveLength(1);
  expect(data.artifacts[0].body).toBe("First result");
  await a.selectFinal(data.commits[0].id);
  expect(data.chats[0].finalCommitId).toBe(data.commits[0].id);
  expect(data.artifacts[0].body).toBe("First result");
  const reloaded = structuredClone(data);
  const reloadedActions = localActions(() => reloaded, () => {});
  await expect(reloadedActions.push(data.commits[1].id)).rejects.toThrow("already been pushed");
  expect(data.prompts[0].projectId).toBe(project);
  await expect(a.assignChat(chat, "")).rejects.toThrow("locked");
  await expect(
    a.review(data.artifacts[0].id, "verified", 100, "Self review"),
  ).rejects.toThrow("self-verified");
});

test('local AI sends conversation context and stores provider replies without credentials', async () => {
  const { vi } = await import('vitest');
  let data = structuredClone(emptyData);
  const a = localActions(() => data, next => { data = next; });
  const chat = await a.createChat('', 'AI chat');
  await a.sendPrompt(chat, 'First question');
  await a.addResult(data.prompts[0].id, 'First answer');
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ text: 'Second answer', grounding: { sources: [{ url: 'https://example.com', title: 'Example' }], supports: [], searchQueries: ['query'] } }), { headers: { 'Content-Type': 'application/json' } }));
  try {
    await a.sendPrompt(chat, 'Follow up', { model: { id: 'gemini-2.5-flash', name: 'Gemini', provider: 'gemini' }, apiKey: 'private-key', googleSearch: true });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body)).messages).toEqual([
      { role: 'user', content: 'First question' }, { role: 'assistant', content: 'First answer' }, { role: 'user', content: 'Follow up' },
    ]);
    expect(JSON.parse(String(request.mock.calls[0][1]?.body)).googleSearch).toBe(true);
    expect(data.prompts[1].replyProvenance?.grounding?.sources[0].title).toBe('Example');
    expect(data.responseVersions[0].provenance?.grounding).toEqual(data.prompts[1].replyProvenance?.grounding);
    expect(data.prompts[1]).toMatchObject({ status: 'complete', reply: 'Second answer', result: '', saved: false, model: 'Gemini' });
    await a.savePrompt(data.prompts[1].id);
    expect(data.prompts[1]).toMatchObject({ saved: true, result: '' });
    expect(data.prompts[1].currentVersionId).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('private-key');
  } finally { request.mockRestore(); }
});

test('local provider failure preserves the prompt for retry', async () => {
  const { vi } = await import('vitest');
  let data = structuredClone(emptyData);
  const a = localActions(() => data, next => { data = next; });
  const chat = await a.createChat('', 'AI chat');
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Quota exceeded' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
  try {
    await a.sendPrompt(chat, 'Keep my prompt', { model: { id: 'gemini-2.5-flash', name: 'Gemini', provider: 'gemini' }, apiKey: 'private-key' });
    expect(data.prompts[0]).toMatchObject({ text: 'Keep my prompt', status: 'failed', error: 'Quota exceeded' });
  } finally { request.mockRestore(); }
});

test('local AI and manual versions survive edits, commits, and reloads', async () => {
  const { vi } = await import('vitest');
  const { loadLocal, storageKey } = await import('./local');
  let data = structuredClone(emptyData);
  const a = localActions(() => data, next => { data = next; });
  const projectId = await a.createProject('Versions', '');
  const chatId = await a.createChat(projectId, 'Chat');
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ text: 'AI original', resolvedModel: 'model-001' }), { headers: { 'Content-Type': 'application/json' } }));
  try {
    await a.sendPrompt(chatId, 'Draft', { model: { id: 'model-alias', name: 'Model', provider: 'chatgpt' } });
    const prompt = data.prompts[0];
    await a.addResult(prompt.id, 'Manual revision');
    await a.commit(chatId, prompt.id, 'Snapshot', data.prompts[0].result, 'First');
    await a.addResult(prompt.id, 'Second revision');
    expect(data.responseVersions.map(v => v.body)).toEqual(['Second revision', 'Manual revision', 'AI original']);
    expect(data.responseVersions[2].provenance).toEqual({ provider: 'chatgpt', requestedModel: 'model-alias', resolvedModel: 'model-001' });
    expect(data.prompts[0].provenance).toBeUndefined();
    expect(data.commits[0]).toMatchObject({ body: 'Manual revision', sourceVersionId: data.responseVersions[1].id });
    expect(data.commits[0].sourceModel).toBeUndefined();
    expect(data.prompts[0].reply).toBe('AI original');
    await a.sendPrompt(chatId, 'Continue', { model: { id: 'model-alias', name: 'Model', provider: 'chatgpt' } });
    expect(JSON.parse(String(request.mock.calls[1][1]?.body)).messages).toEqual([
      { role: 'user', content: 'Draft' }, { role: 'assistant', content: 'AI original' }, { role: 'user', content: 'Continue' },
    ]);
    const stored = JSON.stringify(data);
    vi.stubGlobal('localStorage', { getItem: (key: string) => key === storageKey ? stored : null });
    expect(loadLocal().responseVersions).toEqual(data.responseVersions);
    const legacy = { ...data, responseVersions: undefined, prompts: [{ ...data.prompts[0], currentVersionId: undefined, aiVersionId: undefined }] };
    vi.stubGlobal('localStorage', { getItem: (key: string) => key === storageKey ? JSON.stringify(legacy) : null });
    data = loadLocal();
    await a.addResult(data.prompts[0].id, 'Migrated revision');
    expect(data.responseVersions[1]).toMatchObject({ source: 'legacy', body: 'Second revision' });
  } finally { request.mockRestore(); vi.unstubAllGlobals(); }
});

test('local policy sheets search only their project and retain cited excerpts in AI history', async () => {
  const { vi } = await import('vitest');
  let data = structuredClone(emptyData);
  const actions = localActions(() => data, next => { data = next; });
  const projectId = await actions.createProject('Policies', '');
  const otherId = await actions.createProject('Other project', '');
  await actions.importPolicies(projectId, { sheet: 'HR.csv', rows: [{ row: 2, text: 'Annual leave is 20 days.' }] });
  await actions.importPolicies(otherId, { sheet: 'Other.csv', rows: [{ row: 1, text: 'Other leave policy.' }] });
  const policies = await actions.searchPolicies(projectId, 'leave');
  expect(policies).toHaveLength(1);
  const chatId = await actions.createChat(projectId, 'Leave');
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: '20 days [P1].', resolvedModel: 'test' }), { headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);
  try {
    const ai = { model: { id: 'gemini-test', name: 'Test', provider: 'gemini' as const }, apiKey: 'key', policyIds: [policies[0].id] };
    await actions.sendPrompt(chatId, 'How much leave?', ai);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content).toContain('Annual leave is 20 days.');
    expect(data.prompts[0].replyProvenance?.policyCitations?.[0]).toMatchObject({ sheet: 'HR.csv', row: 2, text: 'Annual leave is 20 days.' });
    await actions.addResult(data.prompts[0].id, 'Human revision');
    expect(data.responseVersions.find(version => version.source === 'ai')?.provenance?.policyCitations).toHaveLength(1);
    const foreign = (await actions.searchPolicies(otherId, 'leave'))[0];
    await expect(actions.sendPrompt(chatId, 'Leak', { ...ai, policyIds: [foreign.id] })).rejects.toThrow('unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  } finally { vi.unstubAllGlobals(); }
});

test('local replies commit without manual result attachment and retain PDF bytes', async () => {
  const { vi } = await import('vitest');
  let data = structuredClone(emptyData);
  const actions = localActions(() => data, next => { data = next; });
  const projectId = await actions.createProject('Documents', '');
  const chatId = await actions.createChat(projectId, 'Report');
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ text: '# Report\n\nComplete.' }), { headers: { 'Content-Type': 'application/json' } }));
  try {
    await actions.sendPrompt(chatId, 'Create a report', { model: { id: 'model', name: 'Model', provider: 'chatgpt' } });
    const prompt = data.prompts[0];
    const attachment = { name: 'report.pdf', mimeType: 'application/pdf' as const, data: btoa('%PDF-1.4\n%%EOF') };
    await actions.commit(chatId, prompt.id, 'Report', prompt.reply!, 'Initial PDF', attachment);
    expect(data.commits[0]).toMatchObject({ attachment, sourceVersionId: prompt.aiVersionId, sourceModel: { provider: 'chatgpt' } });
    expect(data.prompts[0].result).toBe('');
    expect(JSON.parse(JSON.stringify(data)).commits[0].attachment).toEqual(attachment);
  } finally { request.mockRestore(); }
});

test('send lifecycle acknowledges durable prompt creation before a provider failure', async () => {
  const { vi } = await import('vitest');
  let data = structuredClone(emptyData);
  const a = localActions(() => data, next => { data = next; });
  const chat = await a.createChat('', 'Recovery');
  const persisted = vi.fn(() => {
    expect(data.prompts[0]).toMatchObject({ text: 'Preserve this', status: 'generating' });
  });
  const request = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    expect(persisted).toHaveBeenCalledTimes(1);
    throw new Error('Connection lost');
  });
  try {
    await a.sendPrompt(chat, 'Preserve this', { model: { id: 'gemini-2.5-flash', name: 'Gemini', provider: 'gemini' } }, persisted);
    expect(data.prompts[0].status).toBe('failed');
    expect(persisted).toHaveBeenCalledTimes(1);
  } finally { request.mockRestore(); }
});

test('storage failure never acknowledges an unsaved prompt', async () => {
  const { vi } = await import('vitest');
  let data = structuredClone(emptyData);
  const a = localActions(() => data, next => { data = next; });
  const chat = await a.createChat('', 'Recovery');
  const failing = localActions(() => data, () => { throw new Error('Storage full'); });
  const persisted = vi.fn();
  await expect(failing.sendPrompt(chat, 'Keep draft', undefined, persisted)).rejects.toThrow('Storage full');
  expect(persisted).not.toHaveBeenCalled();
  expect(data.prompts).toHaveLength(0);
});
