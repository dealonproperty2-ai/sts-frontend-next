'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, AdminResume, ResumeTemplate, ResumeMode } from '@/lib/adminApi';
import ResumeDocument from '@/components/resume/ResumeDocument';
import ResumePdfPreview from '@/components/resume/pdf/ResumePdfPreview';
import { RESUME_TEMPLATES, getTemplateMeta, isPdfTemplate } from '@/components/resume/templateMeta';
import { buildResumeView } from '@/lib/resumeView';
import { resolveBranding } from '@/lib/branding';
import { exportersFor, runExport } from '@/lib/resumeExport/exporters';

const PRINT_CSS = `
@media print {
  body > *:not(#resume-print-area) { display: none !important; }
  #resume-print-area { display: block !important; position: fixed; inset: 0; background: #fff; z-index: 99999; }
  #resume-print-area > div { box-shadow: none !important; margin: 0 !important; }
  @page { size: A4; margin: 0; }
}
@media screen { #resume-print-area { display: none; } }
`;

// Options come straight from the registry — no hardcoded template list.
const TEMPLATES = RESUME_TEMPLATES.map(t => ({
  value: t.id,
  label: t.atsOptimised ? `${t.name} ★` : t.name,
}));

export default function ResumeViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [resume, setResume] = useState<AdminResume | null>(null);
  const [template, setTemplate] = useState<ResumeTemplate>('classic');
  const [mode, setMode] = useState<ResumeMode>('employee');
  const [exportMsg, setExportMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getResume(id);
      setResume(res.data);
      setTemplate(res.data.template);
      setMode(res.data.resumeMode ?? 'employee');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load resume');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Switch template live and persist the choice.
  async function changeTemplate(t: ResumeTemplate) {
    setTemplate(t);
    try {
      await adminApi.updateResume(id, { template: t });
      setResume(prev => (prev ? { ...prev, template: t } : prev));
    } catch { /* non-blocking; preview already updated */ }
  }

  // Switch employee/client resource mode live and persist the choice.
  async function changeMode(m: ResumeMode) {
    setMode(m);
    try {
      await adminApi.updateResume(id, { resumeMode: m });
      setResume(prev => (prev ? { ...prev, resumeMode: m } : prev));
    } catch { /* non-blocking; preview already updated */ }
  }

  function handlePrint() {
    const el = document.getElementById('resume-doc');
    const printArea = document.getElementById('resume-print-area');
    if (!el || !printArea) return;
    printArea.innerHTML = el.outerHTML;
    window.print();
  }

  /** Registry-driven export: the exporter decides the output format. */
  async function handleExport(format: string) {
    if (!resume) return;
    setDownloading(true);
    setExportMsg('');
    try {
      // Legacy HTML templates have no react-pdf document; keep their existing
      // html2canvas image export for anything the export layer can't serve.
      if (format === 'pdf' && !isPdfTemplate(template)) {
        await legacyImagePdf();
        return;
      }
      const res = await runExport(format, {
        resume,
        view: buildResumeView(resume, mode),
        mode,
        template,
        branding: resolveBranding(),
      });
      setExportMsg(res.message);
    } catch (err) {
      setExportMsg(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setDownloading(false);
    }
  }

  // ── Legacy html2canvas path (classic / modern / minimal) — unchanged ──
  async function legacyImagePdf() {
    if (!resume) return;
    try {
      const el = document.getElementById('resume-doc');
      if (!el) return;
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * pageW) / canvas.width;

      if (imgH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
      } else {
        let pos = 0;
        let rem = imgH;
        while (rem > 0) {
          pdf.addImage(imgData, 'PNG', 0, pos, imgW, imgH);
          rem -= pageH;
          if (rem > 0) { pdf.addPage(); pos -= pageH; }
        }
      }
      const safeName = resume.fullName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'resume';
      pdf.save(`Resume-${safeName}-${template}.pdf`);
      setExportMsg('PDF downloaded (image-based — not ATS parseable).');
    } catch (err) {
      console.error('[resume PDF]', err);
      setExportMsg('Export failed');
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await adminApi.deleteResume(id);
      router.push('/admin/resumes');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  }

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div id="resume-print-area" />

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/admin/resumes" style={{ ...btnSm, textDecoration: 'none' }}>← Back</Link>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--fg)', flex: 1, minWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {resume ? resume.fullName : 'Resume'}
          </h1>

          {resume && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>Template</span>
                <select value={template} onChange={e => changeTemplate(e.target.value as ResumeTemplate)} style={selectSm}>
                  {TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {/* Resume mode applies to the premium templates. */}
              {isPdfTemplate(template) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>Mode</span>
                  <select value={mode} onChange={e => changeMode(e.target.value as ResumeMode)} style={selectSm}>
                    <option value="employee">Employee Resume</option>
                    <option value="client">Client Resource</option>
                  </select>
                </div>
              )}
              {/* The premium preview is the real PDF — its own viewer handles printing. */}
              {!isPdfTemplate(template) && (
                <button onClick={handlePrint} style={btnSecondary}>Print</button>
              )}
              {/* Export actions come from the export registry. */}
              {exportersFor(template).map(x => (
                <button
                  key={x.id}
                  onClick={() => handleExport(x.id)}
                  disabled={downloading || !x.available}
                  title={x.available ? `Export as ${x.label}` : x.unavailableReason}
                  style={x.id === 'pdf' ? btnPrimary : btnSecondary}
                >
                  {downloading && x.id === 'pdf' ? 'Generating…' : x.label}
                </button>
              ))}
              <Link href={`/admin/resumes/${id}/edit`} style={{ ...btnSecondary, textDecoration: 'none' }}>Edit</Link>
              <button onClick={() => { setDeleteOpen(true); setDeleteError(''); }} style={btnDangerFull}>Delete</button>
            </>
          )}
        </div>

        {exportMsg && (
          <div style={{ padding: '8px 24px', fontSize: 13, color: 'var(--fg-2)', background: 'var(--bg-1)', borderBottom: '1px solid var(--line)' }}>
            {exportMsg}
          </div>
        )}

        {/* Preview — premium templates render the actual PDF, so preview === export */}
        <div
          style={
            resume && isPdfTemplate(template)
              ? { flex: 1, overflow: 'hidden', background: 'var(--bg-2)' }
              : { flex: 1, overflow: 'auto', background: 'var(--bg-2)', padding: 24 }
          }
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
          ) : error ? (
            <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
          ) : resume ? (
            isPdfTemplate(template) ? (
              <ResumePdfPreview resume={resume} mode={mode} template={template} />
            ) : (
              <ResumeDocument id="resume-doc" resume={resume} template={template} />
            )
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Resume not found</div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {deleteOpen && resume && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Delete resume?</div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20 }}>“{resume.fullName}” will be permanently removed. This cannot be undone.</div>
            {deleteError && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 12 }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteOpen(false)} disabled={deleting} style={btnSecondary}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={btnDangerFull}>{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const btnSm: React.CSSProperties = { padding: '6px 12px', fontSize: 12, color: 'var(--fg-3)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const selectSm: React.CSSProperties = { padding: '6px 10px', fontSize: 12, color: 'var(--fg)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none', cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { padding: '8px 16px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnDangerFull: React.CSSProperties = { padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#ef4444', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 };
const modalBox: React.CSSProperties = { background: 'var(--bg-1)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', padding: '24px', maxWidth: 'calc(100vw - 24px)', boxSizing: 'border-box', width: 380 };
