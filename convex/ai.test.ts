/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import agent from '@convex-dev/agent/test';
import { APICallError } from 'ai';
import { Agent } from '@convex-dev/agent';
import { afterEach, expect, test, vi } from 'vitest';
import schema from './schema';
import { api, internal } from './_generated/api';
const modules = import.meta.glob('./**/*.ts');
afterEach(() => { vi.restoreAllMocks(); });
async function setup() {
  const t = convexTest(schema, modules); agent.register(t);
  const user = t.withIdentity({ subject: 'ai-user' });
  await user.mutation(api.users.syncCurrentUser, { name: 'Tester', email: 'test@example.com' });
  const chatId = await user.mutation(api.workspace.createChat, { title: 'AI chat' });
  return { t, user, chatId };
}
test('AI generation enforces chat ownership before contacting the provider', async () => {
  const { t, chatId } = await setup();
  const outsider = t.withIdentity({ subject: 'outsider' });
  await outsider.mutation(api.users.syncCurrentUser, { name: 'Other', email: 'other@example.com' });
  const generate = vi.spyOn(Agent.prototype, 'generateText');
  await expect(outsider.action(api.ai.reply, { chatId, text: 'Secret?', model: 'gemini-2.5-flash', apiKey: 'test-key' })).rejects.toThrow('private');
  expect(generate).not.toHaveBeenCalled();
});
test('successful replies persist model provenance without persisting API keys', async () => {
  const { user, chatId, t } = await setup();
  vi.spyOn(Agent.prototype, 'generateText').mockResolvedValue({ text: 'A useful reply' } as never);
  await user.action(api.ai.reply, { chatId, text: 'Hello', model: 'gemini-2.5-flash', apiKey: 'secret-test-key' });
  const rows = await user.query(api.workspace.scope, { chatId, limit: 10 });
  expect(rows.prompts[0]).toMatchObject({ status: 'complete', reply: 'A useful reply', result: '', saved: false, model: 'gemini-2.5-flash' });
  await user.mutation(api.workspace.savePrompt, { promptId: rows.prompts[0].id });
  const saved = (await user.query(api.workspace.scope, { chatId, limit: 10 })).prompts[0];
  expect(saved).toMatchObject({ saved: true, result: '', reply: 'A useful reply' });
  expect(saved.currentVersionId).toBeUndefined();
  expect(JSON.stringify(await t.run(ctx => ctx.db.query('workPrompts').take(10)))).not.toContain('secret-test-key');
});
test('provider failures are sanitized and recorded as retryable failures', async () => {
  const { user, chatId } = await setup();
  vi.spyOn(Agent.prototype, 'generateText').mockRejectedValue(new Error('provider leaked secret-test-key'));
  await user.action(api.ai.reply, { chatId, text: 'Hello', model: 'gemini-2.5-flash', apiKey: 'secret-test-key' });
  const rows = await user.query(api.workspace.scope, { chatId, limit: 10 });
  expect(rows.prompts[0].status).toBe('failed');
  expect(rows.prompts[0].error).toContain('quota');
  expect(JSON.stringify(rows)).not.toContain('secret-test-key');
});
test('concurrent generation is blocked and abandoned generations expire', async () => {
  const { user, chatId } = await setup();
  const args = { chatId, text: 'Hello', model: 'gemini-2.5-flash' };
  const { promptId } = await user.mutation(internal.ai.begin, args);
  await user.mutation(api.workspace.sendPrompt, { chatId, text: 'A notebook prompt during generation' });
  await expect(user.mutation(internal.ai.begin, args)).rejects.toThrow('current reply');
  await user.mutation(internal.ai.expire, { promptId });
  expect((await user.query(api.workspace.scope, { chatId, limit: 10 })).prompts.find(p => p.id === promptId)?.status).toBe('failed');
});

test('AI history survives manual edits and commits retain source provenance', async () => {
  const { user, chatId, t } = await setup();
  const projectId = await user.mutation(api.projects.create, { name: 'History', description: '' });
  await user.mutation(api.workspace.assignChat, { chatId, projectId });
  vi.spyOn(Agent.prototype, 'generateText').mockResolvedValue({ text: 'Original AI reply', response: { modelId: 'gemini-version-001' } } as never);
  await user.action(api.ai.reply, { chatId, text: 'Draft', model: 'gemini-2.5-flash', apiKey: 'secret-test-key' });
  const prompt = (await user.query(api.workspace.scope, { chatId, limit: 10 })).prompts[0];
  await user.mutation(api.workspace.addResult, { promptId: prompt.id, result: 'Human revision' });
  const commitId = await user.mutation(api.workspace.commit, { chatId, promptId: prompt.id, title: 'Original', body: 'Human revision', message: 'Snapshot' });
  await user.mutation(api.workspace.addResult, { promptId: prompt.id, result: 'Second human revision' });
  const versions = await user.query(api.workspace.listResponseVersions, { chatId, paginationOpts: { numItems: 10, cursor: null } });
  expect(versions.page).toHaveLength(3);
  expect(versions.page.map(v => v.body)).toEqual(['Second human revision', 'Human revision', 'Original AI reply']);
  expect(versions.page[2]).toMatchObject({ author: 'Tester', source: 'ai', provenance: { provider: 'gemini', requestedModel: 'gemini-2.5-flash', resolvedModel: 'gemini-version-001' } });
  expect(versions.page[0].provenance).toBeUndefined();
  const updated = (await user.query(api.workspace.scope, { chatId, limit: 10 })).prompts[0];
  expect(updated).toMatchObject({ authorId: prompt.authorId, text: 'Draft', result: 'Second human revision' });
  expect(updated.model).toBeUndefined();
  expect(updated.provenance).toBeUndefined();
  await user.mutation(api.workspace.selectFinal, { commitId });
  const approverId = await t.run(async ctx => {
    const userId = await ctx.db.insert("users", { clerkId: "history-reviewer", name: "Reviewer", email: "reviewer@example.com", plan: "free", createdAt: 0, updatedAt: 0 });
    await ctx.db.insert("projectMembers", { projectId, userId, role: "reviewer", joinedAt: 0 });
    return userId;
  });
  await user.mutation(api.workspace.push, { commitId, approverIds: [approverId] });
  const artifact = (await user.query(api.workspace.scope, { projectId, limit: 10 })).artifacts[0];
  expect(artifact).toMatchObject({ body: 'Human revision', sourceVersionId: versions.page[1].id });
  expect(artifact.sourceModel).toBeUndefined();
  expect(updated.reply).toBe('Original AI reply');
  expect(JSON.stringify(await t.run(ctx => ctx.db.query('workResponseVersions').take(10)))).not.toContain('secret-test-key');
});

test('history is access-controlled and paginated', async () => {
  const { t, user, chatId } = await setup();
  const promptId = await user.mutation(api.workspace.sendPrompt, { chatId, text: 'Private' });
  for (const result of ['One', 'Two', 'Three']) await user.mutation(api.workspace.addResult, { promptId, result });
  const page = await user.query(api.workspace.listResponseVersions, { chatId, paginationOpts: { numItems: 2, cursor: null } });
  expect(page.page.map(v => v.body)).toEqual(['Three', 'Two']);
  const next = await user.query(api.workspace.listResponseVersions, { chatId, paginationOpts: { numItems: 2, cursor: page.continueCursor } });
  expect(next.page.map(v => v.body)).toEqual(['One']);
  const other = t.withIdentity({ subject: 'other' });
  await other.mutation(api.users.syncCurrentUser, { name: 'Other', email: 'other@example.com' });
  await expect(other.query(api.workspace.listResponseVersions, { chatId, paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow('private');
});

test('late completion is saved once and never overwrites a manual revision', async () => {
  const { user, chatId } = await setup();
  const { promptId } = await user.mutation(internal.ai.begin, { chatId, text: 'Draft', model: 'gemini-test' });
  await expect(user.mutation(api.workspace.addResult, { promptId, result: 'Too early' })).rejects.toThrow('Wait');
  await user.mutation(internal.ai.expire, { promptId });
  await user.mutation(api.workspace.addResult, { promptId, result: 'Manual replacement' });
  const completion = { promptId, result: 'Late AI reply', requestedModel: 'gemini-test' };
  await user.mutation(internal.ai.finish, completion);
  await user.mutation(internal.ai.finish, completion);
  const versions = await user.query(api.workspace.listResponseVersions, { chatId, paginationOpts: { numItems: 10, cursor: null } });
  expect(versions.page).toHaveLength(2);
  expect(versions.page[0]).toMatchObject({ body: 'Late AI reply', provenance: { requestedModel: 'gemini-test' } });
  expect(versions.page[0].provenance?.resolvedModel).toBeUndefined();
  expect((await user.query(api.workspace.scope, { chatId, limit: 10 })).prompts[0].result).toBe('Manual replacement');
});

test('legacy results are preserved without guessing provenance', async () => {
  const { user, chatId, t } = await setup();
  const promptId = await user.mutation(api.workspace.sendPrompt, { chatId, text: 'Old prompt' });
  await t.run(ctx => ctx.db.patch(promptId, { result: 'Old result', model: 'Old model label', status: 'complete' }));
  await user.mutation(api.workspace.addResult, { promptId, result: 'New result' });
  const versions = await user.query(api.workspace.listResponseVersions, { chatId, paginationOpts: { numItems: 10, cursor: null } });
  expect(versions.page[1]).toMatchObject({ body: 'Old result', source: 'legacy' });
  expect(versions.page[1].provenance).toBeUndefined();
});

 test('only the chat author can save selected prompts', async () => {
  const { user, chatId, t } = await setup();
  const { promptId } = await user.mutation(internal.ai.begin, { chatId, text: 'Selected', model: 'gemini-test' });
  const other = t.withIdentity({ subject: 'other' });
  await other.mutation(api.users.syncCurrentUser, { name: 'Other', email: 'other@example.com' });
  await expect(other.mutation(api.workspace.savePrompt, { promptId })).rejects.toThrow('private');
  await user.mutation(api.workspace.savePrompt, { promptId });
  await user.mutation(api.workspace.savePrompt, { promptId });
  await user.mutation(internal.ai.finish, { promptId, result: 'Conversational reply', requestedModel: 'gemini-test' });
  expect((await user.query(api.workspace.scope, { chatId, limit: 10 })).prompts[0]).toMatchObject({ saved: true, reply: 'Conversational reply', result: '' });
});

test('Google Search tools and source metadata survive response history', async () => {
  const { user, chatId } = await setup();
  const generate = vi.spyOn(Agent.prototype, 'generateText').mockResolvedValue({
    text: 'A supported claim.',
    providerMetadata: { google: { groundingMetadata: {
      groundingChunks: [{ web: { uri: 'https://example.com', title: 'Example' } }],
      groundingSupports: [{ segment: { text: 'A supported claim.' }, groundingChunkIndices: [0] }],
      webSearchQueries: ['a claim'], searchEntryPoint: { renderedContent: '<div>Google Search</div>' },
    } } },
  } as never);
  await user.action(api.ai.reply, { chatId, text: 'Research', model: 'gemini-2.5-flash', apiKey: 'test-key', googleSearch: true });
  expect(generate.mock.instances[0]).toHaveProperty('options.tools.google_search');
  const prompt = (await user.query(api.workspace.scope, { chatId, limit: 10 })).prompts[0];
  expect(prompt.replyProvenance?.grounding?.sources).toEqual([{ url: 'https://example.com', title: 'Example' }]);
  const versions = await user.query(api.workspace.listResponseVersions, { chatId, paginationOpts: { numItems: 10, cursor: null } });
  expect(versions.page[0].provenance?.grounding).toEqual(prompt.replyProvenance?.grounding);
  await user.mutation(api.workspace.addResult, { promptId: prompt.id, result: 'Human revision' });
  const history = await user.query(api.workspace.listResponseVersions, { chatId, paginationOpts: { numItems: 10, cursor: null } });
  expect(history.page.find(version => version.source === 'ai')?.provenance?.grounding).toEqual(prompt.replyProvenance?.grounding);
  expect(history.page[0].provenance).toBeUndefined();
});

test.each(['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'])('Groq uses server credentials and preserves provenance for %s', async (model) => {
  vi.stubEnv('GROQ_API_KEY', 'server-only-test-key');
  try {
    const { user, chatId, t } = await setup();
    vi.spyOn(Agent.prototype, 'generateText').mockResolvedValue({ text: 'Groq reply', response: { body: { model } } } as never);
    await user.action(api.ai.reply, { chatId, text: 'Hello', model, provider: 'groq' });
    const rows = await user.query(api.workspace.scope, { chatId, limit: 10 });
    expect(rows.prompts[0]).toMatchObject({ status: 'complete', replyProvenance: { provider: 'groq', requestedModel: model } });
    expect(JSON.stringify(await t.run(ctx => ctx.db.query('workPrompts').take(10)))).not.toContain('server-only-test-key');
  } finally { vi.unstubAllEnvs(); }
});

test('Groq rejects unapproved models before generation', async () => {
  const { user, chatId } = await setup();
  const generate = vi.spyOn(Agent.prototype, 'generateText');
  await expect(user.action(api.ai.reply, { chatId, text: 'Hello', model: 'unknown', provider: 'groq' })).rejects.toThrow();
  expect(generate).not.toHaveBeenCalled();
});


test('Groq quota failures expose only the provider retry delay', async () => {
  vi.stubEnv('GROQ_API_KEY', 'server-only-test-key');
  try {
    const { user, chatId } = await setup();
    vi.spyOn(Agent.prototype, 'generateText').mockRejectedValue(new APICallError({ message: 'private provider detail', url: 'https://api.groq.com', requestBodyValues: {}, statusCode: 429, responseHeaders: { 'retry-after': '12' } }));
    await user.action(api.ai.reply, { chatId, text: 'Hello', model: 'openai/gpt-oss-20b', provider: 'groq' });
    const rows = await user.query(api.workspace.scope, { chatId, limit: 10 });
    expect(rows.prompts[0]).toMatchObject({ status: 'failed', error: 'Groq rate limit reached. Retry after 12 seconds.' });
    expect(JSON.stringify(rows)).not.toContain('private provider detail');
  } finally { vi.unstubAllEnvs(); }
});

const freeCatalog = { data: [{ id: 'test/model:free', name: 'Test free', architecture: { input_modalities: ['text'], output_modalities: ['text'] }, pricing: { prompt: '0', completion: '0' } }] };
test('OpenRouter validates current free pricing and saves provider provenance without the server key', async () => {
  vi.stubEnv('OPENROUTER_API_KEY', 'private-router-key');
  try {
    const { user, chatId, t } = await setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(freeCatalog)));
    vi.spyOn(Agent.prototype, 'generateText').mockResolvedValue({ text: 'OpenRouter reply', response: { body: { model: 'test/resolved' } } } as never);
    await user.action(api.ai.reply, { chatId, text: 'Hello', model: 'test/model:free', provider: 'openrouter' });
    const rows = await user.query(api.workspace.scope, { chatId, limit: 10 });
    expect(rows.prompts[0]).toMatchObject({ status: 'complete', replyProvenance: { provider: 'openrouter', requestedModel: 'test/model:free', resolvedModel: 'test/resolved' } });
    expect(JSON.stringify(await t.run(ctx => ctx.db.query('workPrompts').take(10)))).not.toContain('private-router-key');
  } finally { vi.unstubAllEnvs(); }
});

test('OpenRouter blocks paid or removed models and catalog outages before inference', async () => {
  vi.stubEnv('OPENROUTER_API_KEY', 'private-router-key');
  try {
    const { user, chatId } = await setup();
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [{ ...freeCatalog.data[0], pricing: { prompt: '0.1', completion: '0' } }] })));
    const generate = vi.spyOn(Agent.prototype, 'generateText');
    await user.action(api.ai.reply, { chatId, text: 'Hello', model: 'test/model:free', provider: 'openrouter' });
    expect(generate).not.toHaveBeenCalled();
    expect((await user.query(api.workspace.scope, { chatId, limit: 10 })).prompts[0].status).toBe('failed');
    fetch.mockResolvedValue(new Response('unavailable', { status: 503 }));
    await user.action(api.ai.reply, { chatId, text: 'Retry', model: 'test/model:free', provider: 'openrouter' });
    expect(generate).not.toHaveBeenCalled();
  } finally { vi.unstubAllEnvs(); }
});

test('OpenRouter checks ownership before catalog or provider requests', async () => {
  const { t, chatId } = await setup();
  const outsider = t.withIdentity({ subject: 'outsider' });
  await outsider.mutation(api.users.syncCurrentUser, { name: 'Other', email: 'other@example.com' });
  const fetch = vi.spyOn(globalThis, 'fetch');
  await expect(outsider.action(api.ai.reply, { chatId, text: 'Hello', model: 'test/model:free', provider: 'openrouter' })).rejects.toThrow('private');
  expect(fetch).not.toHaveBeenCalled();
});
