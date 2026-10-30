import { useEffect, useState } from 'react';
import { createPdfAttachment, downloadAttachment } from './pdfDocument';
import type { DocumentAttachment } from '../../shared/documents';

export function AttachmentCard({ attachment }: { attachment: DocumentAttachment }) {
  return <div className="document-card"><span aria-hidden="true">▤</span><div><strong>{attachment.name}</strong><small>PDF document · {Math.round(attachment.data.length * .75 / 1024)} KB</small></div><button type="button" className="secondary" onClick={() => downloadAttachment(attachment)}>Download PDF</button></div>;
}
export default function DocumentReply({ text, prompt }: { text: string; prompt: string }) {
  const [result, setResult] = useState<{ attachment?: DocumentAttachment; error?: string }>();
  useEffect(() => {
    let active = true;
    void createPdfAttachment(text, prompt).then(attachment => { if (active) setResult({ attachment }); }).catch(error => { if (active) setResult({ error: error instanceof Error ? error.message : 'PDF generation failed.' }); });
    return () => { active = false; };
  }, [text, prompt]);
  return result?.attachment ? <AttachmentCard attachment={result.attachment} /> : <p role="status">{result?.error || 'Creating your PDF document…'}</p>;
}
