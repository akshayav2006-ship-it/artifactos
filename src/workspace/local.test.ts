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
  await a.push(data.commits[1].id);
  expect(data.artifacts).toHaveLength(1);
  expect(data.artifacts[0].body).toBe("First result");
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
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ text: 'Second answer' }), { headers: { 'Content-Type': 'application/json' } }));
  try {
    await a.sendPrompt(chat, 'Follow up', { model: { id: 'gemini-2.5-flash', name: 'Gemini', provider: 'gemini' }, apiKey: 'private-key' });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body)).messages).toEqual([
      { role: 'user', content: 'First question' }, { role: 'assistant', content: 'First answer' }, { role: 'user', content: 'Follow up' },
    ]);
    expect(data.prompts[1]).toMatchObject({ status: 'complete', result: 'Second answer', model: 'Gemini' });
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
    await a.commit(chatId, prompt.id, 'Snapshot', prompt.result, 'First');
    await a.addResult(prompt.id, 'Manual revision');
    await a.addResult(prompt.id, 'Second revision');
    expect(data.responseVersions.map(v => v.body)).toEqual(['Second revision', 'Manual revision', 'AI original']);
    expect(data.responseVersions[2].provenance).toEqual({ provider: 'chatgpt', requestedModel: 'model-alias', resolvedModel: 'model-001' });
    expect(data.prompts[0].provenance).toBeUndefined();
    expect(data.commits[0]).toMatchObject({ body: 'AI original', sourceVersionId: data.responseVersions[2].id, sourceModel: { resolvedModel: 'model-001' } });
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
