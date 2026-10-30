import type { Route } from '../../shared/workspace';
const pages: Route['page'][] = ['Overview', 'Chat', 'Prompt', 'Artifact', 'Project', 'Inbox', 'Settings'];
export function readRoute(url: URL): Route {
  const page = pages.find(p => p.toLowerCase() === url.searchParams.get('page')) || (url.pathname === '/chat' ? 'Chat' : 'Overview');
  return { page, promptId: url.searchParams.get('prompt') || undefined, projectId: url.searchParams.get('project') || undefined, chatId: url.searchParams.get('chat') || undefined, artifactId: url.searchParams.get('artifact') || undefined };
}
export function routeURL(route: Route): string {
  const params = new URLSearchParams({ page: route.page.toLowerCase() });
  if (route.promptId) params.set('prompt', route.promptId);
  if (route.projectId) params.set('project', route.projectId);
  if (route.chatId) params.set('chat', route.chatId);
  if (route.artifactId) params.set('artifact', route.artifactId);
  return `/workspace?${params}`;
}
