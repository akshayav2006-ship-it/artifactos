import { expect, test } from 'vitest';
import { reportedModel } from './ai';
test('model versions come from provider metadata, not the SDK alias fallback', () => {
  expect(reportedModel(undefined, 'alias')).toBeUndefined();
  expect(reportedModel({ modelId: 'alias' }, 'alias')).toBeUndefined();
  expect(reportedModel({ modelId: 'alias', body: { modelVersion: 'version-001' } }, 'alias')).toBe('version-001');
  expect(reportedModel({ modelId: 'resolved-id' }, 'alias')).toBe('resolved-id');
});

test('Google grounding deduplicates sources, remaps supports, and excludes unsafe links', async () => {
  const { googleGrounding } = await import('./ai');
  expect(googleGrounding(undefined)).toBeUndefined();
  expect(googleGrounding({ google: { groundingMetadata: null } })).toBeUndefined();
  const result = googleGrounding({ google: { groundingMetadata: {
    groundingChunks: [
      { web: { uri: 'https://example.com/a', title: 'Example' } },
      { web: { uri: 'javascript:alert(1)', title: 'Unsafe' } },
      { web: { uri: 'https://example.com/a', title: 'Duplicate' } },
      { web: { uri: 'https://example.com/b' } },
    ],
    groundingSupports: [
      { segment: { text: 'A supported claim.' }, groundingChunkIndices: [0, 1, 2, 3, 99] },
      { segment: { text: 'Unsupported.' }, groundingChunkIndices: [1] },
    ],
    webSearchQueries: ['query', null], searchEntryPoint: { renderedContent: '<div>Google</div>' },
  } } });
  expect(result).toEqual({
    sources: [{ url: 'https://example.com/a', title: 'Example' }, { url: 'https://example.com/b', title: 'example.com' }],
    supports: [{ text: 'A supported claim.', sourceIndices: [0, 1] }],
    searchQueries: ['query'], searchEntryPoint: '<div>Google</div>',
  });
});
