import { afterEach, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { emptyData } from '../../../shared/workspace';
import { AvailabilityPage, NotificationsPage, SearchPage } from './WorkspacePages';

afterEach(() => vi.unstubAllGlobals());
test('dashboard search uses persisted workspace content rather than fixture results', () => {
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ ...emptyData, projects: [{ id: 'p', name: 'Real launch', description: 'Stored project', ownerId: 'local', role: 'owner' }] }) });
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/search?q=launch']}><SearchPage /></MemoryRouter>);
  expect(html).toContain('Real launch');
  expect(html).toContain('1 results');
  expect(html).toContain('saved data on this device');
  expect(html).not.toContain('Northstar');
});
test('notifications expose storage failures with workspace recovery navigation', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); } });
  const html = renderToStaticMarkup(<MemoryRouter><NotificationsPage /></MemoryRouter>);
  expect(html).toContain('role="alert"');
  expect(html).toContain('href="/workspace"');
  expect(html).not.toContain('Mark All Read');
});
test('unsupported destinations explain availability', () => {
  const html = renderToStaticMarkup(<MemoryRouter><AvailabilityPage title="Analytics" /></MemoryRouter>);
  expect(html).toContain('Analytics');
  expect(html).toContain('not available in this version');
  expect(html).toContain('href="/workspace"');
});
