/**
 * Thin, lightweight entry point for generating resource PDFs.
 *
 * The actual react-pdf documents live in resourcePdfDoc.tsx, which pulls in the
 * heavy `@react-pdf/renderer`. Everything here uses dynamic import() so that
 * renderer is fetched only when an admin actually clicks a download button —
 * keeping it out of the initial admin bundle.
 */
import type { AdminResource } from '@/lib/adminApi';
import React from 'react';

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

const safeName = (s: string) =>
  (s || 'candidate').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'candidate';

/** Build a Blob for a single candidate profile (no download). */
export async function candidateProfileBlob(resource: AdminResource): Promise<Blob> {
  const mod = await import('@/lib/resourcePdfDoc');
  return mod.docToBlob(React.createElement(mod.CandidateProfileDocument, { resource }));
}

/** Download a single professional candidate profile PDF. */
export async function downloadCandidateProfile(resource: AdminResource): Promise<void> {
  const blob = await candidateProfileBlob(resource);
  saveBlob(blob, `${safeName(resource.fullName)}-Profile.pdf`);
}

/** Download a multi-candidate client submission PDF (cover + one page each). */
export async function downloadClientSubmission(
  resources: AdminResource[],
  opts: { clientName?: string; message?: string } = {},
): Promise<void> {
  const mod = await import('@/lib/resourcePdfDoc');
  const blob = await mod.docToBlob(
    React.createElement(mod.ClientSubmissionDocument, { resources, ...opts }),
  );
  const stamp = new Date().toISOString().slice(0, 10);
  saveBlob(blob, `STS-Client-Submission-${stamp}.pdf`);
}
