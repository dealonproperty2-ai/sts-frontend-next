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

/**
 * react-pdf's browser build reads a global `Buffer` at render time, but Next.js
 * App Router does NOT polyfill Node globals in client bundles — so without this,
 * `pdf().toBlob()` throws "Buffer is not defined" in the browser and no PDF is
 * ever produced. Install the polyfill (from the already-present `buffer`
 * package) once, before react-pdf's module code runs.
 */
let bufferReady: Promise<void> | null = null;
function ensureBufferPolyfill(): Promise<void> {
  if (bufferReady) return bufferReady;
  bufferReady = (async () => {
    const g = globalThis as unknown as { Buffer?: unknown };
    if (typeof g.Buffer === 'undefined') {
      const mod = (await import('buffer')) as unknown as { Buffer: unknown };
      g.Buffer = mod.Buffer;
    }
  })();
  return bufferReady;
}

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
      // Guard against a non-image response (e.g. an HTML 404 page) that would
      // otherwise be handed to react-pdf as a corrupt image.
      if (blob.type && !blob.type.startsWith('image/')) return undefined;
      const dataUrl = await new Promise<string | undefined>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : undefined);
        fr.onerror = () => resolve(undefined);
        fr.readAsDataURL(blob);
      });
      if (!dataUrl || !dataUrl.startsWith('data:image/')) return undefined;
      // Decode it in the browser first: react-pdf's PNG parser blocks the main
      // thread on an undecodable image, so we only pass logos we know are valid.
      const decoded = await new Promise<boolean>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = dataUrl;
      });
      return decoded ? dataUrl : undefined;
    } catch (err) {
      console.error('[PDF] logo load failed; continuing without logo', err);
      return undefined;
    }
  })();
  return logoPromise;
}

/** Build a Blob for a single confidential candidate profile (no download). */
export async function candidateProfileBlob(resource: AdminResource): Promise<Blob> {
  await ensureBufferPolyfill();
  const [mod, logo] = await Promise.all([import('@/lib/resourcePdfDoc'), loadLogo()]);
  return mod.docToBlob(React.createElement(mod.CandidateProfileDocument, { resource, logo }));
}

/** Download a single confidential candidate profile PDF. */
export async function downloadCandidateProfile(resource: AdminResource): Promise<void> {
  try {
    const blob = await candidateProfileBlob(resource);
    saveBlob(blob, `STS-Profile-${safeName(resource.fullName)}.pdf`);
  } catch (err) {
    console.error('[PDF] candidate profile generation failed', err);
    throw new Error(err instanceof Error ? `PDF generation failed: ${err.message}` : 'PDF generation failed');
  }
}

/**
 * Download a candidate submission PDF. One candidate → starts directly with the
 * profile; multiple → a shortlist summary page precedes the detailed profiles.
 */
export async function downloadClientSubmission(
  resources: AdminResource[],
  opts: { clientName?: string; message?: string } = {},
): Promise<void> {
  if (!resources.length) throw new Error('No candidates selected');
  try {
    await ensureBufferPolyfill();
    const [mod, logo] = await Promise.all([import('@/lib/resourcePdfDoc'), loadLogo()]);
    const blob = await mod.docToBlob(
      React.createElement(mod.ClientSubmissionDocument, { resources, logo, ...opts }),
    );
    const stamp = new Date().toISOString().slice(0, 10);
    const name = resources.length === 1
      ? `STS-Profile-${safeName(resources[0].fullName)}.pdf`
      : `STS-Candidate-Submission-${stamp}.pdf`;
    saveBlob(blob, name);
  } catch (err) {
    console.error('[PDF] client submission generation failed', err);
    throw new Error(err instanceof Error ? `PDF generation failed: ${err.message}` : 'PDF generation failed');
  }
}
