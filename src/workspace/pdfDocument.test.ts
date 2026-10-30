// @vitest-environment node
import { expect, test } from 'vitest';
import { pdfDefinition, createPdfAttachment } from './pdfDocument';
test('PDF export creates a real PDF with formatted document content', async () => {
  const markdown = '# Launch review\n\n## Scope\nA **formatted** document with evidence and a [source](https://example.com).\n\n- Confirm the audience\n- Review the plan\n\n| Step | Owner |\n| --- | --- |\n| Review | Team |\n\n```js\nconst ready = true;\n```';
  const definition = pdfDefinition(markdown, 'Launch review');
  expect(JSON.stringify(definition)).toContain('headerRows');
  expect(JSON.stringify(definition)).toContain('bold');
  const attachment = await createPdfAttachment(markdown, 'Create a launch review document');
  expect(attachment.name).toMatch(/\.pdf$/);
  expect(Buffer.from(attachment.data, 'base64').subarray(0,5).toString()).toBe('%PDF-');
  expect(attachment.data.length).toBeGreaterThan(1000);
});
