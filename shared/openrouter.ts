import type { AIModel } from './ai';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const zero = (value: unknown) => (typeof value === 'string' && value.trim() !== '' || typeof value === 'number') && Number(value) === 0;

// Text chat only: exclude music/audio output and dedicated safety classifiers.
// Check prices, not the model name or :free suffix alone.
export function freeOpenRouterModels(payload: unknown): AIModel[] {
  const data = record(payload).data;
  if (!Array.isArray(data)) throw new Error('Invalid model catalog.');
  const models = new Map<string, AIModel>();
  for (const value of data) {
    const model = record(value), pricing = record(model.pricing), architecture = record(model.architecture);
    const output = architecture.output_modalities, input = architecture.input_modalities;
    if (typeof model.id !== 'string' || !model.id || typeof model.name !== 'string') continue;
    if (!Array.isArray(input) || !input.includes('text') || !Array.isArray(output) || output.length !== 1 || output[0] !== 'text') continue;
    if (/safety|safeguard|prompt-guard/i.test(model.id)) continue;
    if (!zero(pricing.prompt) || !zero(pricing.completion) || !Object.values(pricing).every(zero)) continue;
    models.set(model.id, { id: model.id, name: model.name, provider: 'openrouter' });
  }
  return [...models.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchFreeOpenRouterModels(signal?: AbortSignal): Promise<AIModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', { signal: signal ?? AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('OpenRouter model catalog is unavailable.');
  return freeOpenRouterModels(await response.json());
}

// Only zero-priced providers may serve these requests, even if catalog pricing changes.
export const freeOpenRouterFetch: typeof fetch = async (input, init) => {
  if (typeof init?.body !== 'string') throw new Error('Invalid OpenRouter request.');
  const body = JSON.parse(init.body);
  return fetch(input, { ...init, body: JSON.stringify({ ...body, provider: { max_price: { prompt: 0, completion: 0, request: 0 }, allow_fallbacks: false } }) });
};
