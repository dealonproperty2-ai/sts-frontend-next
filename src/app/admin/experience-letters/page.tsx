'use client';

import { createElement, useState, useEffect, useCallback, useMemo, useRef, FormEvent } from 'react';
import { adminApi, Employee, ExperienceLetter } from '@/lib/adminApi';
import { safeFileSegment } from '@/lib/appointmentLetter';
import { isValidLogoData } from '@/lib/internshipLetter';
import {
  DEFAULT_SIGNATORY, EXPERIENCE_LIMITS, buildExperienceLetter, formatElIssueDate, formatElPeriodDate, generatedExperience,
  normalizeExperienceInput, rlDefaultPronoun, runsToMarkupRl, validateExperienceInput, type RlSalutation,
} from '@/lib/experienceLetter';
import { todayLocalISO } from '@/lib/offerLetter';
import { normalizeImageDataUrl, normalizeOptionalImage } from '@/lib/imageNormalize';
import { downloadExperienceLetterPdf } from '@/lib/experienceLetterPdf';
import { ExperienceLetterSheet, ExperiencePrintRoot, EXPERIENCE_PRINT_CSS } from './ExperienceLetterPreview';

// ── Form state (strings/booleans, so inputs can be empty while typing) ───────
type FormState = {
  employeeId: string; employeeCode: string; showEmployeeCode: boolean; salutation: string; employeeName: string; pronoun: string;
  designation: string; department: string; joiningDate: string; endDate: string; issueDate: string; remarks: string;
  rating: string; introText: string; closingText: string;
  signatoryName: string; signatoryCompany: string; signatoryDepartment: string; signatoryTitle: string;
  logoMode: string; logoData: string; signatureMode: string; signatureData: string;
};
type TextKey = Exclude<keyof FormState, 'showEmployeeCode'>;

const blankForm = (): FormState => ({
  employeeId: '', employeeCode: '', showEmployeeCode: false, salutation: '', employeeName: '', pronoun: 'they',
  designation: '', department: '', joiningDate: '', endDate: '', issueDate: todayLocalISO(), remarks: '',
  rating: 'satisfactory', introText: '', closingText: '',
  signatoryName: '', signatoryCompany: DEFAULT_SIGNATORY.company, signatoryDepartment: DEFAULT_SIGNATORY.department, signatoryTitle: DEFAULT_SIGNATORY.title,
  logoMode: 'default', logoData: '', signatureMode: 'default', signatureData: '',
});

const day = (s: string | null | undefined) => (s ? s.slice(0, 10) : '');

function letterToForm(o: ExperienceLetter): FormState {
  return {
    employeeId: o.employeeId ?? '', employeeCode: o.employeeCode ?? '', showEmployeeCode: Boolean(o.showEmployeeCode), salutation: o.salutation ?? '',
    employeeName: o.employeeName, pronoun: o.pronoun ?? 'they', designation: o.designation, department: o.department ?? '',
    joiningDate: day(o.joiningDate), endDate: day(o.endDate), issueDate: day(o.issueDate), remarks: o.remarks ?? '',
    rating: o.rating ?? 'satisfactory', introText: o.introText ?? '', closingText: o.closingText ?? '',
    signatoryName: o.signatoryName ?? '', signatoryCompany: o.signatoryCompany ?? '', signatoryDepartment: o.signatoryDepartment ?? '', signatoryTitle: o.signatoryTitle ?? '',
    logoMode: o.logoMode ?? 'default', logoData: o.logoData ?? '', signatureMode: o.signatureMode ?? 'default', signatureData: o.signatureData ?? '',
  };
}

const contentOf = (f: FormState | ExperienceLetter) => buildExperienceLetter(normalizeExperienceInput(f as unknown as Record<string, unknown>));
type Content = ReturnType<typeof contentOf>;

/** Re-encodes uploaded images before the PDF engine sees them (see imageNormalize.ts). */
async function pdfSafe(c: Content): Promise<Content> {
  const [logo, signature] = await Promise.all([normalizeOptionalImage(c.logo.src), normalizeOptionalImage(c.signature.src)]);
  return { ...c, logo: { ...c.logo, src: logo }, signature: { ...c.signature, src: signature } };
}
const fileNameOf = (f: { employeeName: string; issueDate: string }) =>
  `STS-ExperienceLetter-${safeFileSegment(f.employeeName)}-${day(f.issueDate) || todayLocalISO()}.pdf`;

type Para = 'intro' | 'closing';
const PARA_KEY: Record<Para, 'introText' | 'closingText'> = { intro: 'introText', closing: 'closingText' };
const PARA_LABEL: Record<Para, string> = { intro: 'Main paragraph — designation, service period & conduct', closing: 'Closing line' };
const IMAGE_MAX_BYTES = 300 * 1024;

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
export default function ExperienceLettersPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [letters, setLetters] = useState<ExperienceLetter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [form, setForm] = useState<FormState>(blankForm);
  const [editing, setEditing] = useState<ExperienceLetter | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [openParas, setOpenParas] = useState<Set<Para>>(new Set());
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

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
      const r = await adminApi.experienceLetters(params);
      setLetters(r.data); setTotal(r.meta.total); setPages(r.meta.pages);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Could not load experience letters.');
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

  const set = (k: TextKey, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function handleEmployee(id: string) {
    const emp = employees.find((e) => e._id === id);
    if (!emp) { set('employeeId', ''); return; }
    setForm((f) => ({
      ...f, employeeId: emp._id, employeeName: emp.name, employeeCode: emp.employeeId || '',
      designation: emp.designation || f.designation, department: emp.department || '',
      joiningDate: day(emp.joiningDate) || f.joiningDate,
    }));
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const input = useMemo(() => normalizeExperienceInput(form as unknown as Record<string, unknown>), [form]);
  const content = useMemo(() => buildExperienceLetter(input), [input]);
  const generated = useMemo(() => generatedExperience(input), [input]);
  const hasPreview = Boolean(input.employeeName || input.designation);
  const dirty = editing ? JSON.stringify(form) !== JSON.stringify(letterToForm(editing)) : false;
  const periodText = input.joiningDate && input.endDate
    ? `${formatElPeriodDate(input.joiningDate)} – ${formatElPeriodDate(input.endDate)}${input.issueDate ? ` · dated ${formatElIssueDate(input.issueDate)}` : ''}` : '';

  function checkForm(): boolean {
    const errors = validateExperienceInput(input, form as unknown as Record<string, unknown>);
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
      const r = editing ? await adminApi.updateExperienceLetter(editing._id, payload) : await adminApi.createExperienceLetter(payload);
      setEditing(r.data);
      setForm(letterToForm(r.data));
      setMsg(editing ? `Letter for ${r.data.employeeName} updated.` : `Letter for ${r.data.employeeName} saved.`);
      loadLetters();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleDownload() {
    setMsg(''); setErr('');
    if (!checkForm()) return;
    setBusy('pdf:form');
    try { await downloadExperienceLetterPdf(await pdfSafe(content), fileNameOf(input)); }
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
      const { data } = await adminApi.experienceLetter(id);
      setEditing(data); setForm(letterToForm(data)); setFieldErrors({}); setOpenParas(new Set());
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load the letter.'); }
  }

  async function savedAction(o: ExperienceLetter, action: 'pdf' | 'print') {
    setBusy(`${action}:${o._id}`); setErr(''); setMsg('');
    try {
      const { data } = await adminApi.experienceLetter(o._id); // always the saved record
      if (action === 'pdf') await downloadExperienceLetterPdf(await pdfSafe(contentOf(data)), fileNameOf({ employeeName: data.employeeName, issueDate: data.issueDate }));
      else { setPrintOverride(contentOf(data)); setPendingPrint(true); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not generate the letter.');
    } finally { setBusy(''); }
  }

  async function handleDelete(o: ExperienceLetter) {
    if (!confirm(`Delete the experience letter for ${o.employeeName}?`)) return;
    setBusy(`del:${o._id}`); setErr('');
    try {
      await adminApi.deleteExperienceLetter(o._id);
      if (editing?._id === o._id) setEditing(null);
      setMsg(`Letter for ${o.employeeName} deleted.`);
      loadLetters();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Delete failed.'); }
    finally { setBusy(''); }
  }

  function startNew() {
    if (dirty && !confirm('Discard unsaved changes to this letter?')) return;
    setForm(blankForm()); setEditing(null); setFieldErrors({}); setOpenParas(new Set()); setMsg(''); setErr('');
  }

  function editParagraph(k: Para) {
    if (!form[PARA_KEY[k]]) set(PARA_KEY[k], runsToMarkupRl(generated[k]));
    setOpenParas((s) => new Set(s).add(k));
  }
  function resetParagraph(k: Para) {
    set(PARA_KEY[k], '');
    setOpenParas((s) => { const n = new Set(s); n.delete(k); return n; });
  }

  function handleImageFile(kind: 'logo' | 'signature', file: File | undefined) {
    const dataKey = kind === 'logo' ? 'logoData' : 'signatureData';
    const what = kind === 'logo' ? 'logo' : 'signature';
    setFieldErrors((fe) => { const n = { ...fe }; delete n[dataKey]; return n; });
    if (!file) return;
    const fail = (m: string) => setFieldErrors((fe) => ({ ...fe, [dataKey]: m }));
    if (!['image/png', 'image/jpeg'].includes(file.type)) { fail('Only PNG or JPEG images are supported.'); return; }
    if (file.size > IMAGE_MAX_BYTES) { fail(`The ${what} must be 300 KB or smaller.`); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = String(reader.result ?? '');
      if (!isValidLogoData(raw)) { fail('This file is not a valid PNG or JPEG image.'); return; }
      let data: string;
      try { data = await normalizeImageDataUrl(raw, 800); } catch (e) { fail(e instanceof Error ? e.message : 'Could not process the image.'); return; }
      if (!isValidLogoData(data)) { fail(`The ${what} is too large after processing — use a smaller image.`); return; }
      setForm((f) => ({ ...f, [dataKey]: data, [kind === 'logo' ? 'logoMode' : 'signatureMode']: 'custom' }));
    };
    reader.onerror = () => fail('Could not read the file.');
    reader.readAsDataURL(file);
  }

  // ── Field helpers ─────────────────────────────────────────────────────────
  const field = (k: string, label: string, node: React.ReactNode, help?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
      <label htmlFor={`el-${k}`} style={lbl}>{label}</label>
      {node}
      {help && <span style={hint}>{help}</span>}
      {fieldErrors[k] && <span style={errText}>{fieldErrors[k]}</span>}
    </div>
  );
  const border = (k: string) => ({ ...inp, borderColor: fieldErrors[k] ? '#f87171' : undefined });
  const text = (k: TextKey, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, help?: string) =>
    field(k, label, <input id={`el-${k}`} style={border(k)} value={form[k]} onChange={(e) => set(k, e.target.value)} {...props} />, help);
  const select = (k: TextKey, label: string, options: Array<[string, string]>, onChange?: (v: string) => void) =>
    field(k, label, (
      <select id={`el-${k}`} style={border(k)} value={form[k]} onChange={(e) => (onChange ? onChange(e.target.value) : set(k, e.target.value))}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    ));
  const row = (...children: React.ReactNode[]) => createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, ...children);
  const imagePicker = (kind: 'logo' | 'signature', label: string, defaultLabel: string, noneLabel: string) => {
    const modeKey = kind === 'logo' ? 'logoMode' : 'signatureMode';
    const dataKey = kind === 'logo' ? 'logoData' : 'signatureData';
    return field(dataKey, label, (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <select id={`el-${dataKey}`} style={inp} value={form[modeKey]} onChange={(e) => set(modeKey, e.target.value)}>
          <option value="default">{defaultLabel}</option>
          <option value="custom">Upload (PNG/JPEG, max 300 KB)</option>
          <option value="none">{noneLabel}</option>
        </select>
        {form[modeKey] === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input aria-label={`Upload ${kind}`} type="file" accept="image/png,image/jpeg" onChange={(e) => handleImageFile(kind, e.target.files?.[0])} style={{ fontSize: 12 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {form[dataKey] && <img src={form[dataKey]} alt={`Uploaded ${kind}`} style={{ maxHeight: 36, maxWidth: 120, background: '#fff', border: '1px solid var(--line)', padding: 2 }} />}
          </div>
        )}
      </div>
    ));
  };

  const printContent = printOverride ?? (hasPreview ? content : null);

  return (
    <>
      <style>{EXPERIENCE_PRINT_CSS}</style>
      <ExperiencePrintRoot content={printContent} />

      <div className="admin-split" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* ── LEFT: form ───────────────────────────────────────────────── */}
        <div className="admin-split-side" style={{ width: 380, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{editing ? `Edit Letter — ${editing.employeeName}` : 'Experience Letter'}</span>
            <button type="button" onClick={startNew} style={btnSmall}>New Letter</button>
          </div>

          <form onSubmit={handleSave} noValidate style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={sectionTitle}>A. Employee Details</div>
            {field('employeeId', 'Prefill from employee (optional)',
              <select id="el-employeeId" style={inp} value={form.employeeId} onChange={(e) => handleEmployee(e.target.value)}>
                <option value="">— Enter details manually —</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.name} ({e.employeeId || e._id.slice(-6)})</option>)}
              </select>)}
            {row(
              <div style={{ flex: '0 0 84px' }}>{select('salutation', 'Salutation', [['', '—'], ['Mr.', 'Mr.'], ['Ms.', 'Ms.'], ['Mrs.', 'Mrs.']],
                (v) => setForm((f) => ({ ...f, salutation: v, pronoun: rlDefaultPronoun(v as RlSalutation) })))}</div>,
              <div style={{ flex: 1, minWidth: 160, display: 'flex' }}>{text('employeeName', 'Employee full name *', { maxLength: EXPERIENCE_LIMITS.name, placeholder: 'e.g. Fauzan Ejaz' })}</div>,
            )}
            {row(
              text('employeeCode', 'Employee ID', { maxLength: EXPERIENCE_LIMITS.code, placeholder: 'e.g. STS0001' }),
              select('pronoun', 'Pronouns', [['he', 'he / his'], ['she', 'she / her'], ['they', 'they / their']]),
            )}
            <label style={{ ...hint, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input id="el-showEmployeeCode" type="checkbox" checked={form.showEmployeeCode} onChange={(e) => setForm((f) => ({ ...f, showEmployeeCode: e.target.checked }))} />
              Show the employee ID in the letter
            </label>

            <div style={sectionTitle}>B. Employment</div>
            {row(
              text('designation', 'Designation *', { list: 'el-designations', maxLength: EXPERIENCE_LIMITS.short, placeholder: 'Frontend Developer Intern' }),
              text('department', 'Department (optional)', { maxLength: EXPERIENCE_LIMITS.short }),
            )}
            <datalist id="el-designations">{['Software Developer', 'Senior Software Developer', 'Frontend Developer', 'Frontend Developer Intern', 'Full Stack Developer', 'Web Developer', 'UI/UX Designer', 'Project Manager', 'HR Executive', 'Accountant', 'Trainer'].map((d) => <option key={d} value={d} />)}</datalist>
            {row(text('joiningDate', 'Joining date *', { type: 'date' }), text('endDate', 'Last working date *', { type: 'date' }))}
            {text('issueDate', 'Letter issue date *', { type: 'date' })}
            {periodText && <span style={hint}>In the letter: {periodText}</span>}

            <div style={sectionTitle}>C. Performance</div>
            {select('rating', 'Character & conduct during service', [['excellent', 'Excellent'], ['very good', 'Very good'], ['good', 'Good'], ['satisfactory', 'Satisfactory']])}
            {field('remarks', 'Performance remarks (optional paragraph)',
              <textarea id="el-remarks" style={{ ...border('remarks'), resize: 'vertical', minHeight: 56 }} value={form.remarks} maxLength={EXPERIENCE_LIMITS.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="e.g. He showed strong ownership of the React migration and mentored new joiners." />,
              'Added after the main paragraph. **text** = bold.')}

            <div style={sectionTitle}>D. Letter Wording (editable)</div>
            <span style={hint}>Generated from the details above. Edit any part; **text** = bold, ^text^ = superscript (e.g. 2^nd^). Edited text no longer updates automatically — use Reset.</span>
            {(['intro', 'closing'] as Para[]).map((k) => {
              const key = PARA_KEY[k];
              const edited = Boolean(form[key]);
              return (
                <div key={k} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label htmlFor={`el-${key}`} style={{ ...lbl, flex: 1 }}>{PARA_LABEL[k]}{edited && <span style={{ color: '#f59e0b' }}> · edited</span>}</label>
                    {!openParas.has(k) && <button type="button" style={btnSmall} onClick={() => editParagraph(k)}>Edit</button>}
                    {(edited || openParas.has(k)) && <button type="button" style={btnSmall} onClick={() => resetParagraph(k)}>Reset</button>}
                  </div>
                  {openParas.has(k) || edited ? (
                    <textarea id={`el-${key}`} style={{ ...inp, resize: 'vertical', minHeight: 80, fontSize: 12 }} value={form[key]} maxLength={EXPERIENCE_LIMITS.paragraph} onChange={(e) => set(key, e.target.value)} />
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.45 }}>
                      {generated[k].map((r, i) => {
                        const t = r.sup ? <sup>{r.text}</sup> : r.text;
                        return r.bold ? <strong key={i}>{t}</strong> : <span key={i}>{t}</span>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={sectionTitle}>E. Signature &amp; Branding</div>
            {imagePicker('signature', 'Authorized signature', 'HR signature (default)', 'No signature (sign by hand)')}
            {text('signatoryName', 'Signatory name (optional)', { maxLength: EXPERIENCE_LIMITS.signatory, placeholder: 'Blank, as in the reference' })}
            {text('signatoryCompany', 'Signatory line — company', { maxLength: EXPERIENCE_LIMITS.signatory })}
            {row(
              text('signatoryDepartment', 'Department line', { maxLength: EXPERIENCE_LIMITS.signatory }),
              text('signatoryTitle', 'Title line', { maxLength: EXPERIENCE_LIMITS.signatory }),
            )}
            {imagePicker('logo', 'Company logo', 'STEP TO SOFT logo (default)', 'No logo')}

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
          <div id="experience-toolbar" style={{ padding: '8px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{hasPreview ? (input.employeeName || 'Untitled employee') : 'Live preview'}</span>
            {editing && <span style={{ fontSize: 11, color: dirty ? '#f59e0b' : 'var(--fg-4)' }}>{dirty ? 'Unsaved changes' : 'Saved'}</span>}
            <span style={{ flex: 1 }} />
            <button type="button" style={btnSec} disabled={!hasPreview || !!busy} onClick={handleDownload}>{busy === 'pdf:form' ? 'Generating…' : 'Download PDF'}</button>
            <button type="button" style={btnSec} disabled={!hasPreview} onClick={handlePrint}>Print</button>
          </div>

          <div ref={previewRef} style={{ flex: 1, overflow: 'auto', padding: 16, background: '#e8e8e8', minHeight: 0 }}>
            {hasPreview ? (
              <div id="experience-screen-preview" style={{ zoom, width: '210mm', margin: '0 auto', boxShadow: '0 2px 16px rgba(0,0,0,0.18)' }}>
                <ExperienceLetterSheet content={content} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
                Fill in the employee’s name and designation to see the letter, or open a saved letter below.
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-1)', flexShrink: 0, maxHeight: 300, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Saved Letters <span style={{ color: 'var(--fg-4)', fontWeight: 400, fontSize: 12 }}>({total})</span></span>
              <input aria-label="Search experience letters" placeholder="Search name, employee ID, designation or department" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inp, width: 'auto', flex: '1 1 200px', padding: '5px 9px', fontSize: 12 }} />
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
                <table id="experience-list" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-2)' }}>
                      {['Employee', 'Designation', 'Service period', 'Issued', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-4)', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {letters.map((o) => (
                      <tr key={o._id} style={{ borderBottom: '1px solid var(--line)', background: editing?._id === o._id ? 'rgba(45,54,217,0.06)' : 'transparent' }}>
                        <td style={{ padding: '7px 12px', fontWeight: 500 }}>{o.employeeName}{o.employeeCode && <span style={{ color: 'var(--fg-4)', fontWeight: 400 }}> · {o.employeeCode}</span>}</td>
                        <td style={{ padding: '7px 12px' }}>{o.designation}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{formatElPeriodDate(day(o.joiningDate))} – {formatElPeriodDate(day(o.endDate))}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{formatElIssueDate(day(o.issueDate))}</td>
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
