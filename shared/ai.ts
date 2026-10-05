export type AIModel = { id: string; name: string; provider: 'gemini' | 'chatgpt' };
export type AIRequest = { model: AIModel; apiKey?: string };
export const geminiModels: AIModel[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'gemini' },
];
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
