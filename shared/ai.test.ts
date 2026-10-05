import { expect, test } from 'vitest';
import { reportedModel } from './ai';
test('model versions come from provider metadata, not the SDK alias fallback', () => {
  expect(reportedModel(undefined, 'alias')).toBeUndefined();
  expect(reportedModel({ modelId: 'alias' }, 'alias')).toBeUndefined();
  expect(reportedModel({ modelId: 'alias', body: { modelVersion: 'version-001' } }, 'alias')).toBe('version-001');
  expect(reportedModel({ modelId: 'resolved-id' }, 'alias')).toBe('resolved-id');
});
