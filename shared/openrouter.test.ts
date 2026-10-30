import { afterEach, expect, test, vi } from 'vitest';
import { freeOpenRouterModels, freeOpenRouterFetch } from './openrouter';
const entry = (id: string, extra = {}) => ({ id, name: id, architecture: { input_modalities: ['text'], output_modalities: ['text'] }, pricing: { prompt: '0', completion: '0' }, ...extra });
afterEach(() => vi.restoreAllMocks());

test('free chat catalog excludes paid, missing-price, audio, and safety entries', () => {
  const rows = [entry('free/model:free'), entry('router'), entry('paid', { pricing: { prompt: '0', completion: '0.01' } }), entry('request-fee', { pricing: { prompt: '0', completion: '0', request: '1' } }), entry('missing', { pricing: {} }), entry('invalid', { pricing: { prompt: '', completion: '0' } }), entry('music', { architecture: { input_modalities: ['text'], output_modalities: ['text', 'audio'] } }), entry('nvidia/content-safety:free'), entry('embed', { architecture: { input_modalities: ['text'], output_modalities: ['embeddings'] } }), entry('free/model:free')];
  expect(freeOpenRouterModels({ data: rows }).map(m => m.id)).toEqual(['free/model:free', 'router']);
  expect(() => freeOpenRouterModels({ error: 'outage' })).toThrow('Invalid model catalog');
});

test('OpenRouter transport enforces zero-price providers and no provider fallback', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
  await freeOpenRouterFetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', body: JSON.stringify({ model: 'free/model:free', provider: { max_price: { prompt: 99 } }, messages: [] }) });
  expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toMatchObject({ model: 'free/model:free', provider: { max_price: { prompt: 0, completion: 0, request: 0 }, allow_fallbacks: false } });
});
