export type AIModel = { id: string; name: string; provider: 'gemini' | 'chatgpt' };
export type AIRequest = { model: AIModel; apiKey?: string };
export const geminiModels: AIModel[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'gemini' },
];
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type ModelProvenance = {
  provider: 'gemini' | 'chatgpt';
  requestedModel: string;
  resolvedModel?: string;
};
export type AIReply = { text: string; resolvedModel?: string };

// The SDK falls back to the requested ID when provider metadata is absent.
// Do not present that fallback as an independently reported model version.
export function reportedModel(response: { modelId?: string; body?: unknown } | undefined, requested: string) {
  const body = response?.body;
  if (body && typeof body === 'object') {
    for (const key of ['modelVersion', 'model']) {
      const value = (body as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  return response?.modelId && response.modelId !== requested ? response.modelId : undefined;
}
