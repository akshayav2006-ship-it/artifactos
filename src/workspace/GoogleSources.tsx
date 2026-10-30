import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  // Insert citations into the original Markdown before parsing so lists, code,
  // and emphasis remain one document. Never interpret provider HTML.
  let cursor = 0;
  let markdown = '';
  for (const support of grounding?.supports ?? []) {
    const start = text.indexOf(support.text, cursor);
    if (!support.text || start < 0) continue;
    const end = start + support.text.length;
    markdown += text.slice(cursor, end);
    for (const sourceIndex of support.sourceIndices) {
      const source = grounding?.sources[sourceIndex];
      if (!source || !safeSourceUrl(source.url)) continue;
      const url = encodeURI(source.url).replace(/[()<>\\\s]/g, character => encodeURIComponent(character));
      markdown += ` [\\[${sourceIndex + 1}\\]](<${url}>)`;
    }
    cursor = end;
  }
  markdown += text.slice(cursor);
  return <div className="markdown-body"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
    a: ({ href, children }) => safeSourceUrl(href)
      ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
      : <span>{children}</span>,
    img: ({ alt }) => <span className="markdown-image-label">{alt ? `[Image: ${alt}]` : '[Image]'}</span>,
    table: ({ children }) => <div className="markdown-table-scroll"><table>{children}</table></div>,
  }}>{markdown}</Markdown></div>;
}
