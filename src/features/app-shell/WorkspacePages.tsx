import { Link, useSearchParams } from 'react-router-dom'
import { useWorkspaceSnapshot } from './useWorkspaceSnapshot'


export function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q')?.trim() || ''
  const { data, error } = useWorkspaceSnapshot()
  const matches = (text: string) => query && text.toLowerCase().includes(query.toLowerCase())
  const results = data ? [
    ...data.projects.filter(p => matches(`${p.name} ${p.description}`)).map(p => ({ id: p.id, title: p.name, kind: 'Project' })),
    ...data.chats.filter(c => matches(c.title)).map(c => ({ id: c.id, title: c.title, kind: 'Chat' })),
    ...data.prompts.filter(p => matches(p.text)).map(p => ({ id: p.id, title: p.text, kind: 'Prompt' })),
    ...data.artifacts.filter(a => matches(`${a.title} ${a.body}`)).map(a => ({ id: a.id, title: a.title, kind: 'Artifact' })),
  ] : []
  return <section className="panel-card"><h2>Workspace search</h2>
    <p>Searches saved data on this device. Use the shared workspace search for shared project data.</p>
    <form action="/search"><label>Search <input name="q" defaultValue={query} required /></label><button>Search</button></form>
    {error && <p role="alert">{error}</p>}
    {query && <p>{results.length} results for “{query}”</p>}
    <ul>{results.map(r => <li key={`${r.kind}-${r.id}`}><strong>{r.kind}</strong>: {r.title}</li>)}</ul>
    <Link to="/workspace">Open workspace to view or search shared items</Link>
  </section>
}

export function NotificationsPage() {
  const { data, error } = useWorkspaceSnapshot()
  const pending = data?.artifacts.filter(a => a.status === 'pending') || []
  return <section className="panel-card"><h2>Workspace notifications</h2>
    <p>Saved updates on this device. Shared invitations and approvals are available inside the shared workspace.</p>
    {error && <p role="alert">{error}</p>}
    <ul>{data?.incoming.map(i => <li key={i.id}>Invitation to {i.projectName} ({i.status})</li>)}
      {pending.map(a => <li key={a.id}>{a.title}: awaiting review</li>)}</ul>
    {!data?.incoming.length && !pending.length && <p>No saved notifications.</p>}
    <Link to="/workspace">Open workspace for invitations and reviews</Link>
  </section>
}

export function AvailabilityPage({ title }: { title: string }) {
  return <section className="panel-card"><h2>{title}</h2><p>This destination is not available in this version of Artifactos.</p><Link to="/workspace">Open workspace</Link></section>
}
