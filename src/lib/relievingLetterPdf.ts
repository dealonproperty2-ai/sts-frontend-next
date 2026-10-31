/**
 * Lightweight entry point for downloading relieving letters as PDF. The
 * react-pdf document (relievingLetterPdfDoc.tsx) is loaded with dynamic
 * import() only when an admin downloads, keeping `@react-pdf/renderer` out of
 * the admin bundle. Runtime plumbing is shared via resourcePdf.ts.
 */
import React from 'react';
import type { RelievingLetterContent } from '@/lib/relievingLetter';
import { ensureBufferPolyfill, saveBlob, withRenderTimeout } from '@/lib/resourcePdf';

export async function relievingLetterBlob(content: RelievingLetterContent): Promise<Blob> {
  await ensureBufferPolyfill();
  const mod = await import('@/lib/relievingLetterPdfDoc');
  return withRenderTimeout(mod.docToBlob(React.createElement(mod.RelievingLetterDocument, { content })));
}

export async function downloadRelievingLetterPdf(content: RelievingLetterContent, fileName: string): Promise<void> {
  try {
    saveBlob(await relievingLetterBlob(content), fileName);
  } catch (err) {
    console.error('[PDF] relieving letter generation failed', err);
    throw new Error(err instanceof Error ? `PDF generation failed: ${err.message}` : 'PDF generation failed');
  }
}
