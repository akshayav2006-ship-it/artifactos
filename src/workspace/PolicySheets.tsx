import { useEffect, useState } from 'react';
import type { Actions } from '../../shared/workspace';
import { parsePolicySheet } from '../../shared/policies';
import type { PolicyRow, PolicyCitation } from '../../shared/policies';

export default function PolicySheets({ projectId, actions, canWrite, selected, select }: {
  projectId: string; actions: Actions; canWrite: boolean; selected: string[]; select: (ids: string[]) => void;
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<PolicyRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void actions.searchPolicies(projectId, text).then(rows => { if (active) { setRows(rows); setError(''); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not search policies.'); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [actions, projectId, text, refresh]);
  return <details className="policy-sheets"><summary>Company policy sheets · {selected.length} selected</summary>
    <p>Import a CSV or TSV export, search its rows, and select up to 8 excerpts to cite in your next AI reply.</p>
    {canWrite && <label>Import policy sheet <input type="file" accept=".csv,.tsv" disabled={busy} onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      setBusy(true); setError('');
      try {
        if (file.size > 300000) throw new Error('Use a CSV or TSV file smaller than 300 KB.');
        if (!/\.(csv|tsv)$/i.test(file.name)) throw new Error('Export the sheet as CSV or TSV first.');
        await actions.importPolicies(projectId, parsePolicySheet(file.name, await file.text(), /\.tsv$/i.test(file.name) ? '\t' : ','));
        setRefresh(value => value + 1);
      } catch (e) { setError(e instanceof Error ? e.message : 'Import failed.'); }
      finally { setBusy(false); }
    }} /></label>}
    <input aria-label="Search company policies" placeholder="Search policy text…" maxLength={200} value={text} onChange={e => setText(e.target.value)} />
    {error && <p role="alert">{error}</p>}
    {busy && <p>Importing sheet…</p>}
    {selected.length > 0 && <button type="button" onClick={() => select([])}>Clear selected excerpts</button>}
    <div className="policy-results">{rows.map(row => <label key={row.id}>
      <input type="checkbox" checked={selected.includes(row.id)} disabled={!canWrite || (!selected.includes(row.id) && selected.length >= 8)} onChange={e => select(e.target.checked ? [...selected, row.id] : selected.filter(id => id !== row.id))} />
      <span><strong>{row.sheet} · row {row.row}</strong><span>{row.text}</span></span>
    </label>)}</div>
    {!rows.length && !error && <p>No policy rows found. Import a sheet or try another search.</p>}
    {rows.length === 30 && <p>Showing up to 30 rows. Search to narrow the results.</p>}
  </details>;
}

export function PolicySources({ citations }: { citations?: PolicyCitation[] }) {
  if (!citations?.length) return null;
  return <div className="policy-citations"><strong>Company policy citations</strong>{citations.map(c => <details key={c.marker}>
    <summary>{c.marker} {c.sheet} · row {c.row}</summary><pre>{c.text}</pre>
  </details>)}<small>Excerpts captured when this response was generated.</small></div>;
}
