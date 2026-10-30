import type { Prompt } from '../../shared/workspace';

export type Draft = { text: string; submission?: { text: string; knownPromptIds: string[] } };
const memory = new Map<string, Draft>();
const storageFailures = new Set<string>();
export const draftStorageFailed = (key: string) => storageFailures.has(key);
export function draftKey(local: boolean, userId: string, chatId?: string, projectId?: string) {
  return `artifactos-draft-v1:${JSON.stringify([local ? 'local' : 'shared', userId, chatId || null, chatId ? null : projectId || null])}`;
}
export function readDraft(key: string): Draft {
  if (memory.has(key)) return memory.get(key)!;
  const raw = localStorage.getItem(key);
  if (!raw) return { text: '' };
  const value = JSON.parse(raw) as Draft;
  if (typeof value.text !== 'string' || (value.submission &&
    (typeof value.submission.text !== 'string' || !Array.isArray(value.submission.knownPromptIds))))
    throw new Error('Saved draft could not be read. Copy your message before reloading.');
  memory.set(key, value);
  return value;
}
export function writeDraft(key: string, draft: Draft) {
  memory.set(key, draft);
  try {
    if (draft.text) localStorage.setItem(key, JSON.stringify(draft));
    else localStorage.removeItem(key);
    storageFailures.delete(key);
  } catch (error) {
    storageFailures.add(key);
    throw error;
  }
}
// Only a newly persisted prompt from this user/chat acknowledges this submission.
// Provider failures are still persisted prompts and must not become unsent drafts.
export function acknowledgeDraft(draft: Draft, prompts: Prompt[], chatId: string | undefined, userId: string): Draft {
  if (!draft.submission || !prompts.some(p => p.chatId === chatId && p.authorId === userId &&
    p.text === draft.submission!.text && !draft.submission!.knownPromptIds.includes(p.id))) return draft;
  return draft.text.trim() === draft.submission.text ? { text: '' } : { text: draft.text };
}
