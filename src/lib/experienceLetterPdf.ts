/**
 * Lightweight entry point for downloading experience letters as PDF. The
 * react-pdf document (experienceLetterPdfDoc.tsx) is loaded with dynamic
 * import() only when an admin downloads, keeping `@react-pdf/renderer` out of
 * the admin bundle. Runtime plumbing is shared via resourcePdf.ts.
 */
import React from 'react';
import type { ExperienceLetterContent } from '@/lib/experienceLetter';
import { ensureBufferPolyfill, saveBlob, withRenderTimeout } from '@/lib/resourcePdf';

export async function experienceLetterBlob(content: ExperienceLetterContent): Promise<Blob> {
  await ensureBufferPolyfill();
  const mod = await import('@/lib/experienceLetterPdfDoc');
  return withRenderTimeout(mod.docToBlob(React.createElement(mod.ExperienceLetterDocument, { content })));
}

export async function downloadExperienceLetterPdf(content: ExperienceLetterContent, fileName: string): Promise<void> {
  try {
    saveBlob(await experienceLetterBlob(content), fileName);
  } catch (err) {
    console.error('[PDF] experience letter generation failed', err);
    throw new Error(err instanceof Error ? `PDF generation failed: ${err.message}` : 'PDF generation failed');
  }
}
