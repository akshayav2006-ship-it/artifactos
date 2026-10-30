import { afterEach, expect, test, vi } from 'vitest';
import { acknowledgeDraft, draftKey, draftStorageFailed, readDraft, writeDraft } from './drafts';
import type { Draft } from './drafts';
import type { Prompt } from '../../shared/workspace';

afterEach(() => vi.unstubAllGlobals());
const pending: Draft = { text: 'hello', submission: { text: 'hello', knownPromptIds: ['old'] } };
const prompt = (extra: Partial<Prompt> = {}): Prompt => ({ id: 'new', chatId: 'chat', authorId: 'user', text: 'hello', status: 'failed', projectId: '', author: 'You', result: '', createdAt: 1, ...extra });

test('draft scopes isolate workspace mode, user, chat and new-chat project', () => {
  const keys = [draftKey(true, 'u'), draftKey(false, 'u'), draftKey(true, 'v'), draftKey(true, 'u', 'chat'), draftKey(true, 'u', undefined, 'project')];
  expect(new Set(keys).size).toBe(keys.length);
  expect(draftKey(true, 'u', 'chat', 'a')).toBe(draftKey(true, 'u', 'chat', 'b'));
  expect(draftKey(true, 'a:b', 'c')).not.toBe(draftKey(true, 'a', 'b:c'));
});
test('persisted failed provider prompts acknowledge a submitted draft', () => {
  expect(acknowledgeDraft(pending, [prompt()], 'chat', 'user')).toEqual({ text: '' });
  expect(acknowledgeDraft(pending, [prompt({ status: 'generating' })], 'chat', 'user')).toEqual({ text: '' });
});
test('old prompts, other users/chats and unsent retry text never acknowledge a draft', () => {
  for (const p of [prompt({ id: 'old' }), prompt({ authorId: 'other' }), prompt({ chatId: 'other' }), prompt({ text: 'different' })])
    expect(acknowledgeDraft(pending, [p], 'chat', 'user')).toBe(pending);
  const retry = { text: 'hello' };
  expect(acknowledgeDraft(retry, [prompt()], 'chat', 'user')).toBe(retry);
});
test('edits made during a send survive persistence acknowledgement', () => {
  expect(acknowledgeDraft({ ...pending, text: 'next message' }, [prompt()], 'chat', 'user')).toEqual({ text: 'next message' });
});
test('drafts save to browser storage and clear only explicitly', () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) || null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) });
  writeDraft('save-test', pending);
  expect(JSON.parse(values.get('save-test')!)).toEqual(pending);
  expect(readDraft('save-test')).toEqual(pending);
  writeDraft('save-test', { text: '' });
  expect(values.has('save-test')).toBe(false);
});
test('storage failure retains the message in memory for navigation recovery', () => {
  vi.stubGlobal('localStorage', { setItem: () => { throw new Error('quota'); } });
  expect(() => writeDraft('quota-test', { text: 'keep me' })).toThrow('quota');
  expect(readDraft('quota-test')).toEqual({ text: 'keep me' });
  expect(draftStorageFailed('quota-test')).toBe(true);
});
test('malformed stored drafts are not silently overwritten by the reader', () => {
  vi.stubGlobal('localStorage', { getItem: () => '{"text":42}' });
  expect(() => readDraft('invalid-test')).toThrow('could not be read');
});
