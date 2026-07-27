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

/**
 * react-pdf only settles its render promise once yoga-layout's WebAssembly
 * engine has initialised. When the environment stops that from happening the
 * promise neither resolves NOR rejects — the caller's spinner would run
 * forever with nothing in the console. That is exactly how a missing CSP
 * allowance for wasm/`data:` presented itself, so bound every render: a stall
 * must surface as an actionable error instead of a permanently busy button.
 */
const RENDER_TIMEOUT_MS = 30_000;

function withRenderTimeout(work: Promise<Blob>): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(
        `PDF engine did not respond within ${RENDER_TIMEOUT_MS / 1000}s. If this persists, ` +
        `check that the Content-Security-Policy allows 'wasm-unsafe-eval' plus data: and ` +
        `blob: sources (see next.config.mjs).`,
      ));
    }, RENDER_TIMEOUT_MS);
    work.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

/** Build a Blob for a single confidential candidate profile (no download). */
export async function candidateProfileBlob(resource: AdminResource): Promise<Blob> {
  await ensureBufferPolyfill();
  const mod = await import('@/lib/resourcePdfDoc');
  return withRenderTimeout(
    mod.docToBlob(React.createElement(mod.CandidateProfileDocument, { resource })),
  );
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
    const mod = await import('@/lib/resourcePdfDoc');
    const blob = await withRenderTimeout(
      mod.docToBlob(React.createElement(mod.ClientSubmissionDocument, { resources, ...opts })),
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
