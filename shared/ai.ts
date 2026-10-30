import type { PolicyCitation } from "./policies.ts";
export type AIModel = { id: string; name: string; provider: 'gemini' | 'chatgpt' | 'groq' | 'openrouter' };
export type AIRequest = { model: AIModel; apiKey?: string; googleSearch?: boolean; policyIds?: string[] };
export const geminiModels: AIModel[] = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', provider: 'gemini' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', provider: 'gemini' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', provider: 'gemini' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', provider: 'gemini' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (preview)', provider: 'gemini' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'gemini' },
];
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type ModelProvenance = {
  provider: 'gemini' | 'chatgpt' | 'groq' | 'openrouter';
  requestedModel: string;
  resolvedModel?: string;
  grounding?: GoogleGrounding;
  policyCitations?: PolicyCitation[];
};
export type AIReply = { text: string; resolvedModel?: string; grounding?: GoogleGrounding };

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

export type GoogleGrounding = {
  sources: { url: string; title: string }[];
  supports: { text: string; sourceIndices: number[] }[];
  searchQueries: string[];
  searchEntryPoint?: string;
};

export function safeSourceUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); }
  catch { return false; }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

// Keep only provider-reported web sources; never infer citations from answer text.
export function googleGrounding(metadata: unknown): GoogleGrounding | undefined {
  const grounding = record(record(record(metadata).google).groundingMetadata);
  if (!Object.keys(grounding).length) return undefined;
  const sources: GoogleGrounding['sources'] = [];
  const chunkIndices = new Map<number, number>();
  const chunks = Array.isArray(grounding.groundingChunks) ? grounding.groundingChunks : [];
  chunks.forEach((chunk, index) => {
    const web = record(record(chunk).web);
    if (!safeSourceUrl(web.uri)) return;
    let sourceIndex = sources.findIndex(source => source.url === web.uri);
    if (sourceIndex < 0) {
      sourceIndex = sources.length;
      sources.push({ url: web.uri, title: typeof web.title === 'string' && web.title.trim() ? web.title : new URL(web.uri).hostname });
    }
    chunkIndices.set(index, sourceIndex);
  });
  const supports: GoogleGrounding['supports'] = [];
  for (const item of Array.isArray(grounding.groundingSupports) ? grounding.groundingSupports : []) {
    const support = record(item);
    const text = record(support.segment).text;
    const indices = Array.isArray(support.groundingChunkIndices) ? support.groundingChunkIndices : [];
    const sourceIndices = [...new Set(indices.flatMap(index => typeof index === 'number' && chunkIndices.has(index) ? [chunkIndices.get(index)!] : []))];
    if (typeof text === 'string' && text && sourceIndices.length) supports.push({ text, sourceIndices });
  }
  const entry = record(grounding.searchEntryPoint).renderedContent;
  return {
    sources, supports,
    searchQueries: Array.isArray(grounding.webSearchQueries) ? grounding.webSearchQueries.filter((query): query is string => typeof query === 'string') : [],
    ...(typeof entry === 'string' && entry ? { searchEntryPoint: entry } : {}),
  };
}

export const groqModels: AIModel[] = [
  { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B · Groq (preview)', provider: 'groq' },
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B · Groq', provider: 'groq' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B · Groq', provider: 'groq' },
];
