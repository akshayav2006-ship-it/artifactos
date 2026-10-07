/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import agent from '@convex-dev/agent/test';
import { Agent } from '@convex-dev/agent';
import { afterEach, expect, test, vi } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
const modules = import.meta.glob('./**/*.ts');
afterEach(() => vi.restoreAllMocks());
async function setup() {
  const t = convexTest(schema, modules); agent.register(t);
  const owner = t.withIdentity({ subject: 'policy-owner' });
  await owner.mutation(api.users.syncCurrentUser, { name: 'Owner', email: 'owner@example.com' });
  const projectId = await owner.mutation(api.projects.create, { name: 'Company', description: '' });
  const chatId = await owner.mutation(api.workspace.createChat, { title: 'Policy questions', projectId });
  const other = t.withIdentity({ subject: 'policy-other' });
  await other.mutation(api.users.syncCurrentUser, { name: 'Other', email: 'other@example.com' });
  await owner.mutation(api.policies.importSheet, { projectId, sheet: 'HR.csv', rows: [{ row: 2, text: 'Annual leave is 20 days.' }, { row: 3, text: 'Expense approval from Finance.' }] });
  return { t, owner, other, projectId, chatId };
}
test('policy import and search enforce project access and read-only roles', async () => {
  const { t, owner, other, projectId } = await setup();
  await expect(other.query(api.policies.search, { projectId, text: '' })).rejects.toThrow('access');
  await expect(other.mutation(api.policies.importSheet, { projectId, sheet: 'Other', rows: [{ row: 1, text: 'secret' }] })).rejects.toThrow('access');
  const otherId = (await other.query(api.users.current, {}))!._id;
  await t.run(ctx => ctx.db.insert('projectMembers', { projectId, userId: otherId, role: 'viewer', joinedAt: 0 }));
  expect(await other.query(api.policies.search, { projectId, text: 'leave' })).toMatchObject([{ sheet: 'HR.csv', row: 2 }]);
  await expect(other.mutation(api.policies.importSheet, { projectId, sheet: 'Other', rows: [{ row: 1, text: 'secret' }] })).rejects.toThrow('permission');
  await expect(owner.mutation(api.policies.importSheet, { projectId, sheet: 'Bad', rows: [{ row: 1, text: '' }] })).rejects.toThrow('6000');
  expect(await owner.query(api.policies.search, { projectId, text: '' })).toHaveLength(2);
});
test('AI policy citations retain exact excerpts in history after manual revisions', async () => {
  const { owner, projectId, chatId } = await setup();
  const policies = await owner.query(api.policies.search, { projectId, text: 'leave' });
  const generate = vi.spyOn(Agent.prototype, 'generateText').mockResolvedValue({ text: 'You have 20 days of annual leave [P1].' } as never);
  await owner.action(api.ai.reply, { chatId, text: 'How much leave?', model: 'gemini-test', apiKey: 'key', policyIds: [policies[0].id] });
  expect(generate.mock.calls[0][2]?.prompt).toContain('Annual leave is 20 days.');
  const prompt = (await owner.query(api.workspace.scope, { chatId, limit: 10 })).prompts[0];
  expect(prompt.replyProvenance?.policyCitations).toEqual([{ marker: '[P1]', policyId: policies[0].id, sheet: 'HR.csv', row: 2, text: 'Annual leave is 20 days.' }]);
  const versions = await owner.query(api.workspace.listResponseVersions, { chatId, paginationOpts: { numItems: 10, cursor: null } });
  expect(versions.page[0].provenance?.policyCitations).toEqual(prompt.replyProvenance?.policyCitations);
  await owner.mutation(api.workspace.addResult, { promptId: prompt.id, result: 'Human revision' });
  const history = await owner.query(api.workspace.listResponseVersions, { chatId, paginationOpts: { numItems: 10, cursor: null } });
  expect(history.page.find(version => version.source === 'ai')?.provenance?.policyCitations).toEqual(prompt.replyProvenance?.policyCitations);
  expect(history.page[0].provenance).toBeUndefined();
});
test('foreign policy IDs are rejected before contacting the AI provider', async () => {
  const { owner, other, projectId } = await setup();
  const policy = (await owner.query(api.policies.search, { projectId, text: '' }))[0];
  const chatId = await other.mutation(api.workspace.createChat, { title: 'Private' });
  const generate = vi.spyOn(Agent.prototype, 'generateText');
  await expect(other.action(api.ai.reply, { chatId, text: 'Leak', model: 'gemini-test', apiKey: 'key', policyIds: [policy.id] })).rejects.toThrow('unavailable');
  expect(generate).not.toHaveBeenCalled();
});
