/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import agent from '@convex-dev/agent/test';
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
