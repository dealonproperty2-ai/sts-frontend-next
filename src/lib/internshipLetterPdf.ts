/**
 * Lightweight entry point for downloading internship experience letters as
 * PDF. The react-pdf document (internshipLetterPdfDoc.tsx) is loaded with
 * dynamic import() only when an admin downloads, keeping `@react-pdf/renderer`
 * out of the admin bundle. Runtime plumbing is shared via resourcePdf.ts.
 */
import React from 'react';
import type { InternshipLetterContent } from '@/lib/internshipLetter';
import { ensureBufferPolyfill, saveBlob, withRenderTimeout } from '@/lib/resourcePdf';

export async function internshipLetterBlob(content: InternshipLetterContent): Promise<Blob> {
  await ensureBufferPolyfill();
  const mod = await import('@/lib/internshipLetterPdfDoc');
  return withRenderTimeout(mod.docToBlob(React.createElement(mod.InternshipLetterDocument, { content })));
}

export async function downloadInternshipLetterPdf(content: InternshipLetterContent, fileName: string): Promise<void> {
  try {
    saveBlob(await internshipLetterBlob(content), fileName);
  } catch (err) {
    console.error('[PDF] internship letter generation failed', err);
    throw new Error(err instanceof Error ? `PDF generation failed: ${err.message}` : 'PDF generation failed');
  }
}
