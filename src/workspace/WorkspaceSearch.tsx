import { useEffect, useRef, useState } from 'react';
import type { Actions, Data, Route, SearchResult } from '../../shared/workspace';
export default function WorkspaceSearch({ data, actions, navigate }: { data: Data; actions: Actions; navigate: (route: Route) => void }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.current?.focus(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    let active = true;
    if (!text.trim()) return;
    const timer = window.setTimeout(() => {
      const term = text.trim().toLowerCase();
      const localResults: SearchResult[] = [
        ...data.projects.filter(p => `${p.name} ${p.description}`.toLowerCase().includes(term)).map(p => ({ id: p.id, kind: 'Project', title: p.name, projectId: p.id })),
        ...data.chats.filter(c => c.title.toLowerCase().includes(term)).map(c => ({ id: c.id, kind: 'Chat', title: c.title, projectId: c.projectId || undefined, chatId: c.id })),
        ...data.prompts.filter(p => p.text.toLowerCase().includes(term)).map(p => ({ id: p.id, kind: 'Prompt', promptId: p.id, title: p.text.slice(0, 180), projectId: p.projectId || undefined, chatId: p.chatId })),
        ...data.artifacts.filter(a => `${a.title} ${a.body}`.toLowerCase().includes(term)).map(a => ({ id: a.id, kind: 'Artifact', title: a.title, projectId: a.projectId, artifactId: a.id })),
      ];
      void (actions.searchWorkspace ? actions.searchWorkspace(text) : Promise.resolve(localResults)).then(found => {
        if (active) { setResults(found); setStatus(found.length ? `${found.length} results` : 'No matching items'); }
      }).catch(() => { if (active) { setResults([]); setStatus('Search unavailable. Try again.'); } });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [text, data, actions]);
  return <div className="workspace-search"><label>Search workspace <kbd>⌘/Ctrl K</kbd><input ref={input} type="search" value={text} placeholder="Projects, chats, prompts, artifacts…" onChange={e => { setText(e.target.value); setResults([]); setStatus('Searching…'); }} onKeyDown={e => { if (e.key === 'Escape') setText(''); }} /></label>
    {text.trim() && <div className="workspace-search-results"><p role="status">{status}</p>{results.map(r => <button key={`${r.kind}:${r.id}`} onClick={() => { navigate({ page: r.kind === 'Artifact' ? 'Artifact' : r.kind === 'Project' ? 'Project' : 'Chat', projectId: r.projectId, chatId: r.chatId, artifactId: r.artifactId, promptId: r.promptId }); setText(''); }}><small>{r.kind} · {data.projects.find(p => p.id === r.projectId)?.name || 'Personal workspace'}</small><span>{r.title}</span></button>)}<small>Up to 100 results; shared search checks up to 100 active memberships and 10 matches per type per project.</small></div>}
  </div>;
}
