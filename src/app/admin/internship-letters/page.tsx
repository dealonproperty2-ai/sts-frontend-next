'use client';

import { createElement, useState, useEffect, useCallback, useMemo, useRef, FormEvent } from 'react';
import { adminApi, Employee, InternshipLetter } from '@/lib/adminApi';
import { safeFileSegment } from '@/lib/appointmentLetter';
import {
  DEFAULT_SIGNATORY_SUBTITLE, DEFAULT_SIGNATORY_TITLE, DEFAULT_WORK_SUMMARY, EDITABLE_PARAGRAPHS, INTERNSHIP_LIMITS,
  INTERNSHIP_TYPES, PERFORMANCE_RATINGS, buildInternshipLetter, defaultPronoun, formatLetterDate, formatPeriodDate,
  generatedParagraphs, isValidLogoData, normalizeInternshipInput, overrideKey, runsToMarkup, splitTechnologies,
  validateInternshipInput, type EditableParagraph, type Salutation,
} from '@/lib/internshipLetter';
import { todayLocalISO } from '@/lib/offerLetter';
import { normalizeImageDataUrl, normalizeOptionalImage } from '@/lib/imageNormalize';
import { downloadInternshipLetterPdf } from '@/lib/internshipLetterPdf';
import { InternshipLetterSheet, InternshipPrintRoot, INTERNSHIP_PRINT_CSS } from './InternshipLetterPreview';

// ── Form state (strings, so inputs can be empty while typing) ────────────────
type FormState = {
  employeeId: string; salutation: string; internName: string; relation: string; guardianSalutation: string; guardianName: string; pronoun: string;
  internshipType: string; role: string; startDate: string; endDate: string; letterDate: string; dateStyle: string;
  workSummary: string; technologies: string; performance: string; remarks: string;
  introText: string; workText: string; performanceText: string; closingText: string;
  signatoryName: string; signatoryTitle: string; signatorySubtitle: string; logoMode: string; logoData: string;
};

const blankForm = (): FormState => ({
  employeeId: '', salutation: '', internName: '', relation: '', guardianSalutation: '', guardianName: '', pronoun: 'they',
  internshipType: 'Paid Internship', role: '', startDate: '', endDate: '', letterDate: todayLocalISO(), dateStyle: 'month',
  workSummary: '', technologies: '', performance: 'satisfactory', remarks: '',
  introText: '', workText: '', performanceText: '', closingText: '',
  signatoryName: '', signatoryTitle: DEFAULT_SIGNATORY_TITLE, signatorySubtitle: DEFAULT_SIGNATORY_SUBTITLE, logoMode: 'default', logoData: '',
});

const day = (s: string | null | undefined) => (s ? s.slice(0, 10) : '');

function letterToForm(o: InternshipLetter): FormState {
  return {
    employeeId: o.employeeId ?? '', salutation: o.salutation ?? '', internName: o.internName, relation: o.relation ?? '',
    guardianSalutation: o.guardianSalutation ?? '', guardianName: o.guardianName ?? '', pronoun: o.pronoun ?? 'they',
    internshipType: o.internshipType ?? '', role: o.role, startDate: day(o.startDate), endDate: day(o.endDate), letterDate: day(o.letterDate),
    dateStyle: o.dateStyle ?? 'month', workSummary: o.workSummary ?? '', technologies: o.technologies ?? '', performance: o.performance ?? 'satisfactory',
    remarks: o.remarks ?? '', introText: o.introText ?? '', workText: o.workText ?? '', performanceText: o.performanceText ?? '', closingText: o.closingText ?? '',
    signatoryName: o.signatoryName ?? '', signatoryTitle: o.signatoryTitle ?? '', signatorySubtitle: o.signatorySubtitle ?? '',
    logoMode: o.logoMode ?? 'default', logoData: o.logoData ?? '',
  };
}

const contentOf = (f: FormState | InternshipLetter) => buildInternshipLetter(normalizeInternshipInput(f as unknown as Record<string, unknown>));
type Content = ReturnType<typeof contentOf>;

/** Re-encodes an uploaded logo before the PDF engine sees it (see imageNormalize.ts). */
async function pdfSafe(c: Content): Promise<Content> {
  return { ...c, logo: { ...c.logo, src: await normalizeOptionalImage(c.logo.src) } };
}
const fileNameOf = (f: { internName: string; letterDate: string }) =>
  `STS-InternshipLetter-${safeFileSegment(f.internName)}-${day(f.letterDate) || todayLocalISO()}.pdf`;

const PARAGRAPH_LABEL: Record<EditableParagraph, string> = {
  intro: 'Paragraph 1 — certification', work: 'Paragraph 2 — work & technologies', performance: 'Paragraph 3 — performance', closing: 'Closing paragraph',
};
const LOGO_MAX_BYTES = 300 * 1024;

// ── Styles (match the existing HR pages) ─────────────────────────────────────
const inp: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, color: 'var(--fg)', background: 'var(--bg-2)',
  border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' };
const hint: React.CSSProperties = { fontSize: 11, color: 'var(--fg-4)' };
const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnSec: React.CSSProperties = { padding: '6px 12px', fontSize: 12, color: 'var(--fg-2)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnSmall: React.CSSProperties = { ...btnSec, padding: '3px 8px', fontSize: 11 };
const errText: React.CSSProperties = { fontSize: 11, color: '#f87171' };

/** Scales the 210 mm sheet down to the available width (never up). */
function useFitZoom() {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setZoom(Math.min(1, Math.max(0.3, (e.contentRect.width - 8) / 794))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, zoom };
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function InternshipLettersPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Saved letters
  const [letters, setLetters] = useState<InternshipLetter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // Form
  const [form, setForm] = useState<FormState>(blankForm);
  const [editing, setEditing] = useState<InternshipLetter | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [openParas, setOpenParas] = useState<Set<EditableParagraph>>(new Set());
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Print: the form's letter, or a saved letter printed from the list.
  const [printOverride, setPrintOverride] = useState<Content | null>(null);
  const [pendingPrint, setPendingPrint] = useState(false);

  const { ref: previewRef, zoom } = useFitZoom();

  const loadEmployees = useCallback(async () => {
    try { setEmployees((await adminApi.employees({ limit: '100' })).data); } catch { /* employee picker is optional */ }
  }, []);

  const loadLetters = useCallback(async () => {
    setListLoading(true); setListError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '10' };
      if (qDebounced) params.q = qDebounced;
      const r = await adminApi.internshipLetters(params);
      setLetters(r.data); setTotal(r.meta.total); setPages(r.meta.pages);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Could not load internship letters.');
    } finally { setListLoading(false); }
  }, [page, qDebounced]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);
  useEffect(() => { loadLetters(); }, [loadLetters]);
  useEffect(() => { const t = setTimeout(() => { setQDebounced(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);

  // Print once the requested content is in the print root (flag reset inside the timer — see offer letters).
  useEffect(() => {
    if (!pendingPrint) return;
    const t = setTimeout(() => { setPendingPrint(false); window.print(); }, 60);
    return () => clearTimeout(t);
  }, [pendingPrint, printOverride]);
  useEffect(() => {
    const done = () => setPrintOverride(null);
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, []);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function setSalutation(v: string) {
    setForm((f) => ({ ...f, salutation: v, pronoun: defaultPronoun(v as Salutation) }));
  }

  function handleEmployee(id: string) {
    const emp = employees.find((e) => e._id === id);
    if (!emp) { set('employeeId', ''); return; }
    setForm((f) => ({
      ...f, employeeId: emp._id, internName: emp.name, role: emp.designation || f.role,
      startDate: day(emp.joiningDate) || f.startDate,
      guardianName: emp.fatherName || '',
      guardianSalutation: emp.fatherName ? 'Mr.' : f.guardianSalutation,
      relation: emp.fatherName ? (f.relation || (f.salutation === 'Mr.' ? 'S/o' : f.salutation ? 'D/o' : '')) : '',
    }));
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const input = useMemo(() => normalizeInternshipInput(form as unknown as Record<string, unknown>), [form]);
  const content = useMemo(() => buildInternshipLetter(input), [input]);
  const generated = useMemo(() => generatedParagraphs(input), [input]);
  const hasPreview = Boolean(input.internName || input.role);
  const dirty = editing ? JSON.stringify(form) !== JSON.stringify(letterToForm(editing)) : false;
  const techs = splitTechnologies(input.technologies);
  const periodText = input.startDate && input.endDate ? `${formatPeriodDate(input.startDate, input.dateStyle)} – ${formatPeriodDate(input.endDate, input.dateStyle)}` : '';

  /** Validates the form for Save/Download/Print; shows the errors and returns false when invalid. */
  function checkForm(): boolean {
    const errors = validateInternshipInput(input, form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) { setErr('Please correct the highlighted fields.'); return false; }
    return true;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setMsg(''); setErr('');
    if (!checkForm()) return;
    setSaving(true);
    try {
      const payload = { ...form };
      const r = editing ? await adminApi.updateInternshipLetter(editing._id, payload) : await adminApi.createInternshipLetter(payload);
      setEditing(r.data);
      setForm(letterToForm(r.data));
      setMsg(editing ? `Letter for ${r.data.internName} updated.` : `Letter for ${r.data.internName} saved.`);
      loadLetters();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleDownload() {
    setMsg(''); setErr('');
    if (!checkForm()) return;
    setBusy('pdf:form');
    try { await downloadInternshipLetterPdf(await pdfSafe(content), fileNameOf(input)); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not generate the PDF.'); }
    finally { setBusy(''); }
  }

  function handlePrint() {
    setMsg(''); setErr('');
    if (!checkForm()) return;
    setPrintOverride(null); setPendingPrint(true);
  }

  async function openLetter(id: string) {
    if (dirty && !confirm('Discard unsaved changes to this letter?')) return;
    setMsg(''); setErr('');
    try {
      const { data } = await adminApi.internshipLetter(id);
      setEditing(data); setForm(letterToForm(data)); setFieldErrors({}); setOpenParas(new Set());
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load the letter.'); }
  }

  async function savedAction(o: InternshipLetter, action: 'pdf' | 'print') {
    setBusy(`${action}:${o._id}`); setErr(''); setMsg('');
    try {
      const { data } = await adminApi.internshipLetter(o._id); // always the saved record
      if (action === 'pdf') await downloadInternshipLetterPdf(await pdfSafe(contentOf(data)),fileNameOf({ internName: data.internName, letterDate: data.letterDate }));
      else { setPrintOverride(contentOf(data)); setPendingPrint(true); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not generate the letter.');
    } finally { setBusy(''); }
  }

  async function handleDelete(o: InternshipLetter) {
    if (!confirm(`Delete the internship letter for ${o.internName}?`)) return;
    setBusy(`del:${o._id}`); setErr('');
    try {
      await adminApi.deleteInternshipLetter(o._id);
      if (editing?._id === o._id) setEditing(null);
      setMsg(`Letter for ${o.internName} deleted.`);
      loadLetters();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Delete failed.'); }
    finally { setBusy(''); }
  }

  function startNew() {
    if (dirty && !confirm('Discard unsaved changes to this letter?')) return;
    setForm(blankForm()); setEditing(null); setFieldErrors({}); setOpenParas(new Set()); setMsg(''); setErr('');
  }

  function editParagraph(k: EditableParagraph) {
    const key = overrideKey(k);
    if (!form[key]) set(key, runsToMarkup(generated[k]));
    setOpenParas((s) => new Set(s).add(k));
  }
  function resetParagraph(k: EditableParagraph) {
    set(overrideKey(k), '');
    setOpenParas((s) => { const n = new Set(s); n.delete(k); return n; });
  }

  function handleLogoFile(file: File | undefined) {
    setFieldErrors((fe) => { const n = { ...fe }; delete n.logoData; return n; });
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) { setFieldErrors((fe) => ({ ...fe, logoData: 'Only PNG or JPEG images are supported.' })); return; }
    if (file.size > LOGO_MAX_BYTES) { setFieldErrors((fe) => ({ ...fe, logoData: 'The logo must be 300 KB or smaller.' })); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const fail = (m: string) => setFieldErrors((fe) => ({ ...fe, logoData: m }));
      const raw = String(reader.result ?? '');
      if (!isValidLogoData(raw)) { fail('This file is not a valid PNG or JPEG image.'); return; }
      let data: string;
      try { data = await normalizeImageDataUrl(raw, 800); } catch (e) { fail(e instanceof Error ? e.message : 'Could not process the image.'); return; }
      if (!isValidLogoData(data)) { fail('The logo is too large after processing — use a smaller image.'); return; }
      setForm((f) => ({ ...f, logoMode: 'custom', logoData: data }));
    };
    reader.onerror = () => setFieldErrors((fe) => ({ ...fe, logoData: 'Could not read the file.' }));
    reader.readAsDataURL(file);
  }

  // ── Field helpers ─────────────────────────────────────────────────────────
  const field = (k: string, label: string, node: React.ReactNode, help?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
      <label htmlFor={`il-${k}`} style={lbl}>{label}</label>
      {node}
      {help && <span style={hint}>{help}</span>}
      {fieldErrors[k] && <span style={errText}>{fieldErrors[k]}</span>}
    </div>
  );
  const border = (k: string) => ({ ...inp, borderColor: fieldErrors[k] ? '#f87171' : undefined });
  const text = (k: keyof FormState, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, help?: string) =>
    field(k, label, <input id={`il-${k}`} style={border(k)} value={form[k]} onChange={(e) => set(k, e.target.value)} {...props} />, help);
  const select = (k: keyof FormState, label: string, options: Array<[string, string]>, onChange?: (v: string) => void) =>
    field(k, label, (
      <select id={`il-${k}`} style={border(k)} value={form[k]} onChange={(e) => (onChange ? onChange(e.target.value) : set(k, e.target.value))}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    ));
  const row = (...children: React.ReactNode[]) => createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, ...children);
  const SAL: Array<[string, string]> = [['', '—'], ['Mr.', 'Mr.'], ['Ms.', 'Ms.'], ['Mrs.', 'Mrs.']];

  const printContent = printOverride ?? (hasPreview ? content : null);

  return (
    <>
      <style>{INTERNSHIP_PRINT_CSS}</style>
      <InternshipPrintRoot content={printContent} />

      <div className="admin-split" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* ── LEFT: form ───────────────────────────────────────────────── */}
        <div className="admin-split-side" style={{ width: 380, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{editing ? `Edit Letter — ${editing.internName}` : 'Internship Experience Letter'}</span>
            <button type="button" onClick={startNew} style={btnSmall}>New Letter</button>
          </div>

          <form onSubmit={handleSave} noValidate style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={sectionTitle}>A. Intern Details</div>
            {field('employeeId', 'Prefill from employee (optional)',
              <select id="il-employeeId" style={inp} value={form.employeeId} onChange={(e) => handleEmployee(e.target.value)}>
                <option value="">— Enter details manually —</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.name} ({e.employeeId || e._id.slice(-6)})</option>)}
              </select>)}
            {row(
              <div style={{ flex: '0 0 84px' }}>{select('salutation', 'Salutation', SAL, setSalutation)}</div>,
              <div style={{ flex: 1, minWidth: 160, display: 'flex' }}>{text('internName', 'Intern full name *', { maxLength: INTERNSHIP_LIMITS.name, placeholder: 'e.g. Zedan Ejaz' })}</div>,
            )}
            {row(
              <div style={{ flex: '0 0 84px' }}>{select('relation', 'Relation', [['', 'None'], ['S/o', 'S/o'], ['D/o', 'D/o'], ['W/o', 'W/o'], ['C/o', 'C/o']])}</div>,
              <div style={{ flex: '0 0 84px' }}>{select('guardianSalutation', 'Title', SAL)}</div>,
              <div style={{ flex: 1, minWidth: 140, display: 'flex' }}>{text('guardianName', 'Parent / guardian name', { maxLength: INTERNSHIP_LIMITS.name })}</div>,
            )}
            {select('pronoun', 'Pronouns used in the letter', [['he', 'he / him / his'], ['she', 'she / her / her'], ['they', 'they / them / their']])}

            <div style={sectionTitle}>B. Internship</div>
            {row(
              select('internshipType', 'Internship type', INTERNSHIP_TYPES.map((t) => [t, t] as [string, string])),
              text('role', 'Role / position *', { list: 'il-roles', maxLength: INTERNSHIP_LIMITS.role, placeholder: 'Software Developer Intern' }),
            )}
            <datalist id="il-roles">{['Software Developer Intern', 'Web Developer Intern', 'Full Stack Developer Intern', 'Frontend Developer Intern', 'Backend Developer Intern', 'UI/UX Designer Intern', 'Data Analyst Intern', 'Digital Marketing Intern', 'HR Intern'].map((r) => <option key={r} value={r} />)}</datalist>
            {row(text('startDate', 'Start date *', { type: 'date' }), text('endDate', 'End date *', { type: 'date' }))}
            {row(
              select('dateStyle', 'Show period as', [['month', 'Month & year (January 2026)'], ['day', 'Full date (05 January 2026)']]),
              text('letterDate', 'Letter date *', { type: 'date' }),
            )}
            {periodText && <span style={hint}>Period in the letter: {periodText} · dated {formatLetterDate(input.letterDate)}</span>}

            <div style={sectionTitle}>C. Work &amp; Performance</div>
            {text('workSummary', 'Worked on', { maxLength: INTERNSHIP_LIMITS.summary, placeholder: DEFAULT_WORK_SUMMARY }, 'Completes “…he worked on ___ and gained practical experience in …”. Blank uses the default.')}
            {field('technologies', 'Technologies (comma-separated)',
              <input id="il-technologies" style={border('technologies')} value={form.technologies} maxLength={INTERNSHIP_LIMITS.technologies} placeholder="React.js, Next.js, JavaScript, HTML, CSS, Bootstrap" onChange={(e) => set('technologies', e.target.value)} />)}
            {techs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {techs.map((t) => <span key={t} style={{ fontSize: 11, padding: '1px 7px', borderRadius: 99, background: 'var(--bg-2)', border: '1px solid var(--line)' }}>{t}</span>)}
              </div>
            )}
            {select('performance', 'Overall performance', PERFORMANCE_RATINGS.map((p) => [p, p[0].toUpperCase() + p.slice(1)] as [string, string]))}
            {field('remarks', 'Additional remarks (optional paragraph)',
              <textarea id="il-remarks" style={{ ...border('remarks'), resize: 'vertical', minHeight: 56 }} value={form.remarks} maxLength={INTERNSHIP_LIMITS.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="e.g. He also contributed to the company’s internal LMS." />,
              'Added after the performance paragraph. Use **text** for bold.')}

            <div style={sectionTitle}>D. Letter Wording (editable)</div>
            <span style={hint}>Each paragraph is generated from the details above. Edit any of them; use **text** for bold. Edited paragraphs no longer update automatically — use Reset to go back to the generated wording.</span>
            {EDITABLE_PARAGRAPHS.map((k) => {
              const key = overrideKey(k);
              const edited = Boolean(form[key]);
              return (
                <div key={k} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label htmlFor={`il-${key}`} style={{ ...lbl, flex: 1 }}>{PARAGRAPH_LABEL[k]}{edited && <span style={{ color: '#f59e0b' }}> · edited</span>}</label>
                    {!openParas.has(k) && <button type="button" style={btnSmall} onClick={() => editParagraph(k)}>Edit</button>}
                    {(edited || openParas.has(k)) && <button type="button" style={btnSmall} onClick={() => resetParagraph(k)}>Reset</button>}
                  </div>
                  {openParas.has(k) || edited ? (
                    <textarea id={`il-${key}`} style={{ ...inp, resize: 'vertical', minHeight: 80, fontSize: 12 }} value={form[key]} maxLength={INTERNSHIP_LIMITS.paragraph} onChange={(e) => set(key, e.target.value)} />
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.45 }}>
                      {generated[k].map((r, i) => (r.bold ? <strong key={i}>{r.text}</strong> : <span key={i}>{r.text}</span>))}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={sectionTitle}>E. Signatory &amp; Branding</div>
            {text('signatoryName', 'Signatory name (optional)', { maxLength: INTERNSHIP_LIMITS.signatory, placeholder: 'Blank, as in the reference' })}
            {row(
              text('signatoryTitle', 'Signatory line 1', { maxLength: INTERNSHIP_LIMITS.signatory }),
              text('signatorySubtitle', 'Signatory line 2', { maxLength: INTERNSHIP_LIMITS.signatory }),
            )}
            {field('logoData', 'Company logo', (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <select id="il-logoData" aria-label="Logo option" style={inp} value={form.logoMode} onChange={(e) => set('logoMode', e.target.value)}>
                  <option value="default">STEP TO SOFT logo (default)</option>
                  <option value="custom">Upload a logo (PNG/JPEG, max 300 KB)</option>
                  <option value="none">No logo</option>
                </select>
                {form.logoMode === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <input aria-label="Upload logo" type="file" accept="image/png,image/jpeg" onChange={(e) => handleLogoFile(e.target.files?.[0])} style={{ fontSize: 12 }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {form.logoData && <img src={form.logoData} alt="Uploaded logo" style={{ maxHeight: 36, maxWidth: 120, background: '#fff', border: '1px solid var(--line)', padding: 2 }} />}
                  </div>
                )}
              </div>
            ))}

            {err && <div role="alert" style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#991b1b' }}>{err}</div>}
            {msg && <div role="status" style={{ padding: '8px 12px', background: '#dcfce7', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#166534' }}>{msg}</div>}

            <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : editing ? 'Update Letter' : 'Save Letter'}
            </button>
            <span style={hint}>Download and Print use the letter exactly as shown in the preview; saving keeps it in the list below for later.</span>
          </form>
        </div>

        {/* ── RIGHT: preview + saved letters ───────────────────────────── */}
        <div className="admin-split-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div id="internship-toolbar" style={{ padding: '8px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{hasPreview ? (input.internName || 'Untitled intern') : 'Live preview'}</span>
            {editing && <span style={{ fontSize: 11, color: dirty ? '#f59e0b' : 'var(--fg-4)' }}>{dirty ? 'Unsaved changes' : 'Saved'}</span>}
            <span style={{ flex: 1 }} />
            <button type="button" style={btnSec} disabled={!hasPreview || !!busy} onClick={handleDownload}>{busy === 'pdf:form' ? 'Generating…' : 'Download PDF'}</button>
            <button type="button" style={btnSec} disabled={!hasPreview} onClick={handlePrint}>Print</button>
          </div>

          <div ref={previewRef} style={{ flex: 1, overflow: 'auto', padding: 16, background: '#e8e8e8', minHeight: 0 }}>
            {hasPreview ? (
              <div id="internship-screen-preview" style={{ zoom, width: '210mm', margin: '0 auto', boxShadow: '0 2px 16px rgba(0,0,0,0.18)' }}>
                <InternshipLetterSheet content={content} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
                Fill in the intern’s name and role to see the letter, or open a saved letter below.
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-1)', flexShrink: 0, maxHeight: 300, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Saved Letters <span style={{ color: 'var(--fg-4)', fontWeight: 400, fontSize: 12 }}>({total})</span></span>
              <input aria-label="Search internship letters" placeholder="Search name, role, employee ID or technology" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inp, width: 'auto', flex: '1 1 200px', padding: '5px 9px', fontSize: 12 }} />
              {pages > 1 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button type="button" style={btnSmall} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{page}/{pages}</span>
                  <button type="button" style={btnSmall} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              )}
            </div>
            <div style={{ overflow: 'auto' }}>
              {listLoading ? (
                <div style={{ padding: 16, fontSize: 12, color: 'var(--fg-4)' }}>Loading…</div>
              ) : listError ? (
                <div role="alert" style={{ padding: 16, fontSize: 12, color: '#f87171' }}>{listError} <button type="button" style={btnSmall} onClick={loadLetters}>Retry</button></div>
              ) : letters.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: 'var(--fg-4)' }}>{qDebounced ? 'No letters match this search.' : 'No saved letters yet.'}</div>
              ) : (
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-2)' }}>
                      {['Intern', 'Role', 'Period', 'Letter date', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-4)', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {letters.map((o) => (
                      <tr key={o._id} style={{ borderBottom: '1px solid var(--line)', background: editing?._id === o._id ? 'rgba(45,54,217,0.06)' : 'transparent' }}>
                        <td style={{ padding: '7px 12px', fontWeight: 500 }}>{o.internName}{o.employeeCode && <span style={{ color: 'var(--fg-4)', fontWeight: 400 }}> · {o.employeeCode}</span>}</td>
                        <td style={{ padding: '7px 12px' }}>{o.role}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{formatPeriodDate(day(o.startDate), o.dateStyle)} – {formatPeriodDate(day(o.endDate), o.dateStyle)}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{formatLetterDate(day(o.letterDate))}</td>
                        <td style={{ padding: '7px 12px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                            <button type="button" style={btnSmall} onClick={() => openLetter(o._id)}>Edit</button>
                            <button type="button" style={{ ...btnSmall, color: '#16a34a', borderColor: '#86efac' }} disabled={!!busy} onClick={() => savedAction(o, 'pdf')}>{busy === `pdf:${o._id}` ? '…' : 'PDF'}</button>
                            <button type="button" style={btnSmall} disabled={!!busy} onClick={() => savedAction(o, 'print')}>Print</button>
                            <button type="button" style={{ ...btnSmall, color: '#ef4444', borderColor: '#fca5a5' }} disabled={!!busy} onClick={() => handleDelete(o)}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
