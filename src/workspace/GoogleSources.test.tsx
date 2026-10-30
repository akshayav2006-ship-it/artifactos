import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GoogleSources, GroundedText } from './GoogleSources';

const grounding = {
  sources: [{ url: 'https://example.com', title: 'Example' }],
  supports: [{ text: 'A claim.', sourceIndices: [0, 99] }],
  searchQueries: ['query'],
  searchEntryPoint: '<style>div { color: red }</style><div>Google suggestions</div>',
};

test('inline citations preserve Unicode text and link only valid sources', () => {
  const html = renderToStaticMarkup(<GroundedText text="🌏 A claim. End." grounding={grounding} />);
  expect(html).toContain('🌏 A claim.');
  expect(html).toContain('href="https://example.com"');
  expect(html).toContain('[1]');
  expect(html).not.toContain('[100]');
  expect(html).toContain('End.');
  expect(renderToStaticMarkup(<GroundedText text="Plain reply" />)).toBe('<div class="markdown-body"><p>Plain reply</p></div>');
});

test('Google suggestions render in an isolated frame and source titles are escaped', () => {
  const html = renderToStaticMarkup(<GoogleSources grounding={grounding} />);
  expect(html).toContain('Sources from Google Search');
  expect(html).toContain('sandbox="allow-popups allow-popups-to-escape-sandbox"');
  expect(html).toContain('Google suggestions');
  expect(html).not.toContain('<style>');
  const unsafe = renderToStaticMarkup(<GoogleSources grounding={{ ...grounding, sources: [{ title: '<script>bad</script>', url: 'javascript:alert(1)' }] }} />);
  expect(unsafe).not.toContain('href="javascript:');
  expect(unsafe).toContain('&lt;script&gt;');
});


test('replies render headings, emphasis, nested lists, tables, and fenced code as Markdown', () => {
  const text = '### 1. **Ether (ETH)**\n\n- **Role:** Gas\n  - Native asset\n\n| Coin | Type |\n| --- | --- |\n| ETH | Native |\n\n```js\nconst value = "<safe>";\n```';
  const html = renderToStaticMarkup(<GroundedText text={text} />);
  expect(html).toContain('<h3>1. <strong>Ether (ETH)</strong></h3>');
  expect(html).toContain('<strong>Role:</strong>');
  expect(html.match(/<ul>/g)).toHaveLength(2);
  expect(html).toContain('<table>');
  expect(html).toContain('<th>Coin</th>');
  expect(html).toContain('<pre><code class="language-js">');
  expect(html).toContain('&lt;safe&gt;');
  expect(html).not.toContain('###');
});

test('Markdown blocks executable HTML, unsafe links, and remote image loads', () => {
  const html = renderToStaticMarkup(<GroundedText text={'<script>alert(1)</script>\n\n[Bad](javascript:alert) [Good](https://example.com) ![Remote](https://example.com/pixel.png)'} />);
  expect(html).not.toContain('<script');
  expect(html).not.toContain('javascript:');
  expect(html).not.toContain('<img');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain('[Image: Remote]');
});

test('grounded Markdown preserves emphasis and citations together', () => {
  const html = renderToStaticMarkup(<GroundedText text="**A claim.** End." grounding={grounding} />);
  expect(html).toContain('<strong>A claim.');
  expect(html).toContain('href="https://example.com"');
  expect(html).toContain('[1]');
});
