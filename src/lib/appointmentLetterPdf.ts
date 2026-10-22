/**
 * Lightweight entry point for downloading appointment letters as PDF.
 *
 * The react-pdf document lives in appointmentLetterPdfDoc.tsx and is pulled in
 * with dynamic import() only when an admin clicks a download button, keeping
 * `@react-pdf/renderer` out of the initial admin bundle. Runtime plumbing
 * (Buffer polyfill, render timeout, blob download) is shared with the resource
 * PDFs in resourcePdf.ts.
 */
import React from 'react';
import type { AppointmentLetterContent } from '@/lib/appointmentLetter';
import { ensureBufferPolyfill, saveBlob, withRenderTimeout } from '@/lib/resourcePdf';

/** Build the letter PDF as a Blob (no download). */
export async function appointmentLetterBlob(content: AppointmentLetterContent): Promise<Blob> {
  await ensureBufferPolyfill();
  const mod = await import('@/lib/appointmentLetterPdfDoc');
  return withRenderTimeout(mod.docToBlob(React.createElement(mod.AppointmentLetterDocument, { content })));
}

/** Generate and download the letter PDF. */
export async function downloadAppointmentLetterPdf(content: AppointmentLetterContent, fileName: string): Promise<void> {
  try {
    saveBlob(await appointmentLetterBlob(content), fileName);
  } catch (err) {
    console.error('[PDF] appointment letter generation failed', err);
    throw new Error(err instanceof Error ? `PDF generation failed: ${err.message}` : 'PDF generation failed');
  }
}
