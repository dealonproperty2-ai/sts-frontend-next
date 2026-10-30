/**
 * Lightweight entry point for downloading offer letters as PDF. The react-pdf
 * document (offerLetterPdfDoc.tsx) is loaded with dynamic import() only when
 * an admin downloads, keeping `@react-pdf/renderer` out of the admin bundle.
 * Runtime plumbing (Buffer polyfill, render timeout, blob download) is shared
 * with the other PDFs in resourcePdf.ts.
 */
import React from 'react';
import type { OfferLetterContent } from '@/lib/offerLetter';
import { ensureBufferPolyfill, saveBlob, withRenderTimeout } from '@/lib/resourcePdf';

export async function offerLetterBlob(content: OfferLetterContent): Promise<Blob> {
  await ensureBufferPolyfill();
  const mod = await import('@/lib/offerLetterPdfDoc');
  return withRenderTimeout(mod.docToBlob(React.createElement(mod.OfferLetterDocument, { content })));
}

export async function downloadOfferLetterPdf(content: OfferLetterContent, fileName: string): Promise<void> {
  try {
    saveBlob(await offerLetterBlob(content), fileName);
  } catch (err) {
    console.error('[PDF] offer letter generation failed', err);
    throw new Error(err instanceof Error ? `PDF generation failed: ${err.message}` : 'PDF generation failed');
  }
}
