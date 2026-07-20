import type { AdminResume, ResumeMode, ResumeTemplate } from '@/lib/adminApi';
import type { ResumeView } from '@/lib/resumeView';
import type { CompanyBranding } from '@/lib/branding';

/**
 * Export layer contract.
 *
 * Templates render data; exporters decide the output format. Adding DOCX (or
 * HTML, or a share link backed by a token endpoint) means implementing this
 * interface and registering it — no template changes.
 */

export type ExportFormat = 'pdf' | 'json' | 'link' | 'docx';

export interface ExportContext {
  /** Raw record — exporters should prefer `view` so mode masking is honoured. */
  resume: AdminResume;
  /** Mode-masked, render-ready projection. Never contains PII in client mode. */
  view: ResumeView;
  mode: ResumeMode;
  template: ResumeTemplate;
  branding: CompanyBranding;
}

export interface ExportResult {
  /** Suggested download filename, extension included. */
  filename: string;
  /** Present for file exports. */
  blob?: Blob;
  /** Present for link-style exports. */
  url?: string;
  /** Human-readable confirmation for the UI. */
  message: string;
}

export interface ResumeExporter {
  id: ExportFormat;
  label: string;
  extension: string;
  mimeType: string;
  /** False renders the action disabled with `unavailableReason` as a tooltip. */
  available: boolean;
  unavailableReason?: string;
  /** Templates this exporter can handle; omit for "all". */
  supportsEngines?: Array<'pdf' | 'html'>;
  run(ctx: ExportContext): Promise<ExportResult>;
}

/** Filesystem-safe base name, e.g. "Resource-Profile-Riya-Sharma". */
export function exportBaseName(ctx: ExportContext): string {
  const safe = (ctx.view.fullName || 'resume')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  const prefix = ctx.mode === 'client' ? 'Resource-Profile' : 'Resume';
  return `${prefix}-${safe || 'document'}`;
}
