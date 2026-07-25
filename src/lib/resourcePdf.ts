/**
 * Thin, lightweight entry point for generating resource PDFs.
 *
 * The actual react-pdf documents live in resourcePdfDoc.tsx, which pulls in the
 * heavy `@react-pdf/renderer`. Everything here uses dynamic import() so that
 * renderer is fetched only when an admin actually clicks a download button —
 * keeping it out of the initial admin bundle.
 *
 * All generated PDFs are CLIENT-FACING confidential submissions: they never
 * expose a candidate's direct contact details (see resourcePdfDoc.tsx).
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

// Load the company logo once as a data URI so react-pdf embeds it without a
// network fetch during rendering (which would otherwise risk a broken image).
// Cached across calls; failure degrades gracefully to a text-only header.
let logoPromise: Promise<string | undefined> | null = null;
function loadLogo(): Promise<string | undefined> {
  if (logoPromise) return logoPromise;
  logoPromise = (async () => {
    try {
      const res = await fetch('/logo3.png');
      if (!res.ok) return undefined;
      const blob = await res.blob();
      return await new Promise<string | undefined>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : undefined);
        fr.onerror = () => resolve(undefined);
        fr.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  })();
  return logoPromise;
}

/** Build a Blob for a single confidential candidate profile (no download). */
export async function candidateProfileBlob(resource: AdminResource): Promise<Blob> {
  const [mod, logo] = await Promise.all([import('@/lib/resourcePdfDoc'), loadLogo()]);
  return mod.docToBlob(React.createElement(mod.CandidateProfileDocument, { resource, logo }));
}

/** Download a single confidential candidate profile PDF. */
export async function downloadCandidateProfile(resource: AdminResource): Promise<void> {
  const blob = await candidateProfileBlob(resource);
  saveBlob(blob, `STS-Profile-${safeName(resource.fullName)}.pdf`);
}

/**
 * Download a candidate submission PDF. One candidate → starts directly with the
 * profile; multiple → a shortlist summary page precedes the detailed profiles.
 */
export async function downloadClientSubmission(
  resources: AdminResource[],
  opts: { clientName?: string; message?: string } = {},
): Promise<void> {
  const [mod, logo] = await Promise.all([import('@/lib/resourcePdfDoc'), loadLogo()]);
  const blob = await mod.docToBlob(
    React.createElement(mod.ClientSubmissionDocument, { resources, logo, ...opts }),
  );
  const stamp = new Date().toISOString().slice(0, 10);
  const name = resources.length === 1
    ? `STS-Profile-${safeName(resources[0].fullName)}.pdf`
    : `STS-Candidate-Submission-${stamp}.pdf`;
  saveBlob(blob, name);
}
