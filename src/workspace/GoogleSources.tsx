import type { GoogleGrounding } from '../../shared/ai';
import { safeSourceUrl } from '../../shared/ai';

export function GoogleSources({ grounding }: { grounding?: GoogleGrounding }) {
  if (!grounding) return null;
  return <div className="google-sources">
    <strong>Sources from Google Search</strong>
    {grounding.sources.length ? <ol>{grounding.sources.map((source, index) =>
      <li key={`${index}:${source.url}`}>{safeSourceUrl(source.url)
        ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>
        : source.title}</li>,
    )}</ol> : <p>No web sources were returned for this reply.</p>}
    {grounding.searchEntryPoint && <iframe title="Google Search suggestions" className="google-search-suggestions"
      sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer"
      srcDoc={`<!doctype html><html><head><base target="_blank"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:"></head><body style="margin:0">${grounding.searchEntryPoint}</body></html>`} />}
  </div>;
}

export function GroundedText({ text, grounding }: { text: string; grounding?: GoogleGrounding }) {
  // Match the provider's segment text rather than treating UTF-8 offsets as JS indices.
  let cursor = 0;
  const parts = [];
  for (const [index, support] of (grounding?.supports ?? []).entries()) {
    const start = text.indexOf(support.text, cursor);
    if (!support.text || start < 0) continue;
    const end = start + support.text.length;
    parts.push(<span key={index}>{text.slice(cursor, end)}<sup className="source-citations">
      {support.sourceIndices.map(sourceIndex => {
        const source = grounding?.sources[sourceIndex];
        return source && safeSourceUrl(source.url) ? <a key={sourceIndex} href={source.url} title={source.title}
          target="_blank" rel="noopener noreferrer">[{sourceIndex + 1}]</a> : null;
      })}
    </sup></span>);
    cursor = end;
  }
  return <pre>{parts}{text.slice(cursor)}</pre>;
}
