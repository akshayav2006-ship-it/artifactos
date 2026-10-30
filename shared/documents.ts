export type DocumentAttachment = { name: string; mimeType: 'application/pdf'; data: string };

export function isDocumentRequest(prompt: string): boolean {
  return /\b(?:as|in)\s+(?:a\s+)?pdf\b|\bpdf\s+(?:file|document|format)\b/i.test(prompt)
    || /\b(?:create|generate|write|make|prepare|draft|give|provide|need|want)\b[\s\S]{0,160}\b(?:pdf|docs?|document|report)\b/i.test(prompt);
}
export function documentName(prompt: string): string {
  return `${prompt.replace(/[^a-z0-9 -]/gi, '').trim().slice(0,70) || 'Generated document'}.pdf`;
}
export function validateAttachment(attachment?: DocumentAttachment): void {
  if (!attachment) return;
  if (attachment.mimeType !== 'application/pdf' || !attachment.name.toLowerCase().endsWith('.pdf') || attachment.name.length > 120 || /[/\\]/.test(attachment.name)) throw new Error('Choose a PDF attachment.');
  if (attachment.data.length > 750000 || !attachment.data.startsWith('JVBERi0') || attachment.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(attachment.data)) throw new Error('The PDF attachment is invalid or exceeds 550 KB.');
}
