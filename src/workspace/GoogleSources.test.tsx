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
  expect(renderToStaticMarkup(<GroundedText text="Plain reply" />)).toBe('<pre>Plain reply</pre>');
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
