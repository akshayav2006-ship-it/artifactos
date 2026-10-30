import { lexer } from 'marked';
import type { Token, Tokens } from 'marked';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { documentName, validateAttachment } from '../../shared/documents';
import type { DocumentAttachment } from '../../shared/documents';

function inline(tokens: Token[] | undefined, fallback = ''): Content[] {
  if (!tokens) return [fallback];
  return tokens.map(token => {
    if (token.type === 'strong') return { text: inline((token as Tokens.Strong).tokens), bold: true };
    if (token.type === 'em') return { text: inline((token as Tokens.Em).tokens), italics: true };
    if (token.type === 'codespan') return { text: token.text, font: 'Roboto', background: '#eeeeee' };
    if (token.type === 'link') return { text: inline((token as Tokens.Link).tokens), color: '#244b9b', ...( /^https?:\/\//.test(token.href) ? { link: token.href } : {}) };
    if (token.type === 'br') return '\n';
    if (token.type === 'image') return `[Image: ${token.text}]`;
    return 'text' in token ? String(token.text) : '';
  });
}
export function pdfDefinition(markdown: string, title: string): TDocumentDefinitions {
  const blocks = (tokens: Token[]): Content[] => tokens.flatMap((token): Content[] => {
    if (token.type === 'heading') return [{ text: inline(token.tokens), fontSize: [22,18,15,13,12,11][token.depth - 1], bold: true, margin: [0,12,0,7], headlineLevel: token.depth }];
    if (token.type === 'paragraph' || token.type === 'text') return [{ text: inline(token.tokens, token.text), margin: [0,0,0,8] }];
    if (token.type === 'list') {
      const items = (token as Tokens.List).items.map(item => ({ stack: blocks(item.tokens) }));
      return [token.ordered ? { ol: items, margin: [0,0,0,8] } : { ul: items, margin: [0,0,0,8] }];
    }
    if (token.type === 'code') return [{ text: String(token.text).split('\n').flatMap(line => line.match(/.{1,95}/g) || ['']).join('\n'), fontSize: 9, background: '#f3f3f3', margin: [8,8,8,12], preserveLeadingSpaces: true }];
    if (token.type === 'blockquote') return [{ stack: blocks((token as Tokens.Blockquote).tokens), margin: [14,4,0,10], color: '#555555' }];
    if (token.type === 'table') { const table = token as Tokens.Table; return [{ table: { headerRows: 1, widths: table.header.map(() => '*'), body: [table.header.map(cell => ({ text: inline(cell.tokens), bold: true, fillColor: '#eeeeee' })), ...table.rows.map(row => row.map(cell => ({ text: inline(cell.tokens) })))] }, layout: 'lightHorizontalLines', margin: [0,6,0,12] }]; }
    if (token.type === 'hr') return [{ text: ' ', margin: [0,4,0,4] }];
    return [];
  });
  return { info: { title, creator: 'Artifactos' }, pageSize: 'A4', pageMargins: [48,48,48,48], defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.25, color: '#171717' }, content: blocks(lexer(markdown)), footer: (page, count) => ({ text: `${page} / ${count}`, alignment: 'center', fontSize: 9, color: '#666666', margin: [0,12,0,0] }) };
}
export async function createPdfAttachment(markdown: string, prompt: string): Promise<DocumentAttachment> {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]);
  pdfMake.addVirtualFileSystem(fonts);
  const name = documentName(prompt);
  const data = await pdfMake.createPdf(pdfDefinition(markdown, name.replace(/\.pdf$/i,''))).getBase64();
  const attachment: DocumentAttachment = { name, mimeType: 'application/pdf', data };
  validateAttachment(attachment);
  return attachment;
}
export function downloadAttachment(attachment: DocumentAttachment) {
  const bytes = Uint8Array.from(atob(attachment.data), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: attachment.mimeType }));
  const link = document.createElement('a'); link.href = url; link.download = attachment.name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
