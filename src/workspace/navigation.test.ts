import { describe, expect, it } from 'vitest';
import { readRoute, routeURL } from './navigation';
import { loadPreference, preferenceKey, savePreference } from './preferences';
import type { Route } from '../../shared/workspace';
describe('workspace navigation', () => {
  it('round trips every page and identity through a refreshed URL', () => {
    for (const page of ['Overview', 'Project', 'Chat', 'Prompt', 'Artifact', 'Inbox', 'Settings'] as const) {
      const route: Route = { page, projectId: 'project /&', chatId: 'chat?=', artifactId: 'artifact#', promptId: 'prompt &/?' };
      expect(readRoute(new URL(routeURL(route), 'https://artifactos.test'))).toEqual(route);
    }
    expect(readRoute(new URL('https://artifactos.test/chat')).page).toBe('Chat');
    expect(readRoute(new URL('https://artifactos.test/workspace?page=unknown')).page).toBe('Overview');
  });
  it('restores independent history entries', () => {
    const entries: Route[] = [{ page: 'Overview' }, { page: 'Chat', projectId: 'one', chatId: 'two' }, { page: 'Artifact', projectId: 'one', artifactId: 'three' }];
    const urls = entries.map(routeURL);
    for (const index of [2, 1, 0, 1, 2]) expect(readRoute(new URL(urls[index], 'https://artifactos.test'))).toMatchObject(entries[index]);
  });
});
it('isolates nonsecret preferences by account and workspace and strips credentials', () => {
  const values = new Map<string, string>();
  const storage = { setItem: (k: string, v: string) => { values.set(k, v); }, getItem: (k: string) => values.get(k) ?? null };
  const key = preferenceKey('alice', 'shared:project');
  savePreference(storage, key, { model: { id: 'gemini-test', name: 'Test', provider: 'gemini' }, apiKey: 'secret', googleSearch: true, policyIds: ['private'] });
  expect(values.get(key)).not.toContain('secret');
  expect(values.get(key)).not.toContain('private');
  expect(loadPreference(storage, key)).toEqual({ model: { id: 'gemini-test', name: 'Test', provider: 'gemini' }, googleSearch: true });
  expect(loadPreference(storage, preferenceKey('bob', 'shared:project'))).toBeUndefined();
  expect(loadPreference(storage, preferenceKey('alice', 'shared:other'))).toBeUndefined();
  values.set(key, '{bad');
  expect(loadPreference(storage, key)).toBeUndefined();
});
