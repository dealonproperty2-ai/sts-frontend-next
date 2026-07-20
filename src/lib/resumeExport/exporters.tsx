import { getTemplateMeta } from '@/components/resume/templateMeta';
import { type ResumeExporter, type ExportContext, exportBaseName } from './types';

/* ── PDF ──────────────────────────────────────────────────────────────────── */

const pdfExporter: ResumeExporter = {
  id: 'pdf',
  label: 'PDF',
  extension: 'pdf',
  mimeType: 'application/pdf',
  available: true,
  supportsEngines: ['pdf'],
  async run(ctx: ExportContext) {
    // Both the renderer and the document are imported lazily, so the ~500kB
    // react-pdf subtree stays out of the route bundle until an export is run.
    const [{ pdf }, { default: ResumePdfDocument }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/resume/pdf/ResumePdfDocument'),
    ]);
    const blob = await pdf(
      <ResumePdfDocument
        resume={ctx.resume}
        mode={ctx.mode}
        template={ctx.template}
        branding={ctx.branding}
      />
    ).toBlob();
    return {
      filename: `${exportBaseName(ctx)}.pdf`,
      blob,
      message: 'PDF downloaded.',
    };
  },
};

/* ── JSON ─────────────────────────────────────────────────────────────────── */

const jsonExporter: ResumeExporter = {
  id: 'json',
  label: 'JSON',
  extension: 'json',
  mimeType: 'application/json',
  available: true,
  async run(ctx: ExportContext) {
    // Exports the masked VIEW, not the raw record: a client-mode JSON export
    // must not carry contact details that the PDF withholds.
    const payload = {
      exportedAt: new Date().toISOString(),
      mode: ctx.mode,
      template: ctx.template,
      company: ctx.mode === 'client' ? ctx.branding.name : undefined,
      resume: ctx.view,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    return {
      filename: `${exportBaseName(ctx)}.json`,
      blob,
      message: 'JSON exported (mode-masked).',
    };
  },
};

/* ── Share link ───────────────────────────────────────────────────────────── */

const linkExporter: ResumeExporter = {
  id: 'link',
  label: 'Copy Link',
  extension: '',
  mimeType: 'text/plain',
  available: true,
  async run(ctx: ExportContext) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/admin/resumes/${ctx.resume._id}?template=${ctx.template}&mode=${ctx.mode}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
    return {
      filename: '',
      url,
      // Deliberately explicit: this is an internal link, not a public share.
      message: 'Internal admin link copied (sign-in required).',
    };
  },
};

/* ── DOCX (registered, not yet implemented) ───────────────────────────────── */

const docxExporter: ResumeExporter = {
  id: 'docx',
  label: 'DOCX',
  extension: 'docx',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  available: false,
  unavailableReason: 'DOCX export is not implemented yet — add a docx builder here.',
  async run() {
    throw new Error('DOCX export is not implemented yet.');
  },
};

export const EXPORTERS: ResumeExporter[] = [pdfExporter, jsonExporter, linkExporter, docxExporter];

export function getExporter(id: string): ResumeExporter | undefined {
  return EXPORTERS.find((e) => e.id === id);
}

/** Exporters valid for the given template (engine-aware). */
export function exportersFor(templateId: string): ResumeExporter[] {
  const engine = getTemplateMeta(templateId)?.engine;
  return EXPORTERS.filter((e) => !e.supportsEngines || (engine && e.supportsEngines.includes(engine)));
}

/** Runs an exporter and performs the browser-side download when it yields a blob. */
export async function runExport(id: string, ctx: ExportContext) {
  const exporter = getExporter(id);
  if (!exporter) throw new Error(`Unknown export format: ${id}`);
  if (!exporter.available) throw new Error(exporter.unavailableReason ?? 'Export unavailable');

  const result = await exporter.run(ctx);
  if (result.blob) {
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return result;
}
