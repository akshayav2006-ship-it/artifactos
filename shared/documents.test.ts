import { expect, test } from 'vitest';
import { isDocumentRequest, documentName, validateAttachment } from './documents';
test('document requests default to PDFs while ordinary questions stay text', () => {
  for (const text of ['Create a report about sales', 'generate me docs about blockchain', 'Write a document', 'Explain this as a PDF', 'give me a pdf about AI']) expect(isDocumentRequest(text)).toBe(true);
  for (const text of ['What is a PDF?', 'Explain blockchain', 'How can I edit documents?']) expect(isDocumentRequest(text)).toBe(false);
  expect(documentName('Create ../report')).toBe('Create report.pdf');
});
test('PDF attachments reject invalid names, content, and excessive sizes', () => {
  expect(() => validateAttachment({ name: 'report.pdf', mimeType: 'application/pdf', data: btoa('%PDF-1.4\n%%EOF') })).not.toThrow();
  expect(() => validateAttachment({ name: '../report.pdf', mimeType: 'application/pdf', data: 'JVBERi0=' })).toThrow();
  expect(() => validateAttachment({ name: 'report.pdf', mimeType: 'application/pdf', data: btoa('<script>') })).toThrow();
  expect(() => validateAttachment({ name: 'report.pdf', mimeType: 'application/pdf', data: 'JVBERi0' + 'A'.repeat(750000) })).toThrow();
});
