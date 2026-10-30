import { useEffect, useState } from 'react';
import type { Prompt } from '../../shared/workspace';
import { acknowledgeDraft, draftKey, draftStorageFailed, readDraft, writeDraft } from './drafts';
import type { Draft } from './drafts';

const storageWarning = 'Draft storage is unavailable. Keep this tab open and copy your message before leaving.';

export function useChatDraft(local: boolean, userId: string, chatId: string | undefined, projectId: string | undefined, prompts: Prompt[]) {
  const key = draftKey(local, userId, chatId, projectId);
  const [initial] = useState(() => {
    try { return { draft: readDraft(key), error: draftStorageFailed(key) ? storageWarning : '' }; }
    catch { return { draft: { text: '' } as Draft, error: storageWarning }; }
  });
  const [draft, setDraft] = useState(initial.draft);
  const [error, setError] = useState(initial.error);
  const visible = acknowledgeDraft(draft, prompts, chatId, userId);
  useEffect(() => {
    if (visible === draft) return;
    try { writeDraft(key, visible); }
    catch { /* Keep the in-memory draft and show recovery controls on the next edit. */ }
  }, [key, visible, draft]);
  function save(next: Draft, targetKey = key) {
    if (targetKey === key) setDraft(next);
    try { writeDraft(targetKey, next); setError(''); }
    catch { setError(storageWarning); }
  }
  return {
    text: visible.text, error,
    setText: (text: string) => save({ text }),
    retry: () => save(visible),
    begin: (id: string, submittedText: string) => {
      const target = draftKey(local, userId, id);
      let latest: Draft;
      try { latest = readDraft(key); } catch { latest = visible; }
      const pending = { text: latest.text, submission: { text: submittedText, knownPromptIds: prompts.map(p => p.id) } };
      save(pending, target);
      if (target !== key) save({ text: '' });
      return () => {
        // onPersisted is called by the send adapter once prompt persistence succeeds.
        let current: Draft;
        try { current = readDraft(target); } catch { current = pending; }
        if (current.text.trim() === submittedText) save({ text: '' }, target);
      };
    },
  };
}
