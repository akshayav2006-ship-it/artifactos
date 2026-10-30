import type { AIRequest } from '../../shared/ai';
export const preferenceKey = (account: string, workspace: string) => `artifactos.preferences.v1:${encodeURIComponent(account)}:${encodeURIComponent(workspace)}`;
export function savePreference(storage: Pick<Storage, 'setItem'>, key: string, value?: AIRequest) {
  storage.setItem(key, JSON.stringify(value ? { model: { id: value.model.id, name: value.model.name, provider: value.model.provider }, googleSearch: !!value.googleSearch } : null));
}
export function loadPreference(storage: Pick<Storage, 'getItem'>, key: string): AIRequest | undefined {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    if (!value || typeof value.model?.id !== 'string' || typeof value.model?.name !== 'string' || !['gemini', 'groq', 'openrouter', 'chatgpt'].includes(value.model?.provider)) return;
    return { model: { id: value.model.id, name: value.model.name, provider: value.model.provider }, googleSearch: value.googleSearch === true };
  } catch { return; }
}
