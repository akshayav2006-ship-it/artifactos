import { expect, test } from 'vitest';
import { OperationPending } from './pending';

test('operation guard rejects duplicates while unrelated actions proceed and releases failures', async () => {
  const pending = new OperationPending();
  let complete!: () => void;
  const first = pending.run('chat:a', () => new Promise<void>(resolve => { complete = resolve; }));
  await expect(pending.run('chat:a', async () => 'duplicate')).rejects.toThrow('already in progress');
  expect(await pending.run('chat:b', async () => 'other chat')).toBe('other chat');
  expect(await pending.run('review:artifact', async () => 'review')).toBe('review');
  complete();
  await first;
  await expect(pending.run('chat:a', async () => { throw new Error('provider failed'); })).rejects.toThrow('provider failed');
  expect(await pending.run('chat:a', async () => 'retry')).toBe('retry');
});
