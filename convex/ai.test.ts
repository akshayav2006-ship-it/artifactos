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
  expect(rows.prompts[0]).toMatchObject({ status: 'complete', result: 'A useful reply', model: 'gemini-2.5-flash' });
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
