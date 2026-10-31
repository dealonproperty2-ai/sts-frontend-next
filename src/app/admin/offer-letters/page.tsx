'use client';

import { createElement, useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
import { adminApi, Employee, OfferLetter } from '@/lib/adminApi';
import { HR_NAME_DEFAULT } from '@/lib/hrConstants';
import { formatRupees, safeFileSegment } from '@/lib/appointmentLetter';
import {
  EMPLOYMENT_TYPES, OFFER_STATUS_LABEL, OFFER_STATUSES, OFFER_TEMPLATE_APPROVED, OFFER_TRANSITIONS,
  ACCEPTANCE_EDITABLE_STATUSES, OFFER_LIMITS, buildOfferLetter, isDeadlinePassed, normalizeOfferInput, todayLocalISO,
  validateAcceptance, validateOfferInput, type OfferStatus,
} from '@/lib/offerLetter';
import { downloadOfferLetterPdf } from '@/lib/offerLetterPdf';
import { OfferLetterHtml, OfferPrintRoot, OFFER_PRINT_CSS } from './OfferLetterPreview';

// ── Form state (strings, so inputs can be empty while typing) ────────────────
type FormState = {
  employeeId: string; salutation: string; candidateName: string; candidateEmail: string; candidatePhone: string; candidateAddress: string;
  department: string; designation: string; employmentType: string; workLocation: string; reportingManager: string;
  joiningDate: string; issueDate: string; validUntil: string;
  monthlyGross: string; basicSalary: string; hra: string; specialAllowance: string; annualCtc: string;
  benefits: string; incentives: string; probationPeriod: string; workingHours: string; additionalTerms: string; hrName: string;
  acceptanceDate: string; acceptancePlace: string;
};

const blankForm = (): FormState => ({
  employeeId: '', salutation: '', candidateName: '', candidateEmail: '', candidatePhone: '', candidateAddress: '',
  department: '', designation: '', employmentType: '', workLocation: '', reportingManager: '',
  joiningDate: '', issueDate: todayLocalISO(), validUntil: '',
  monthlyGross: '', basicSalary: '', hra: '', specialAllowance: '', annualCtc: '',
  benefits: '', incentives: '', probationPeriod: '3 (Three) months', workingHours: '', additionalTerms: '', hrName: HR_NAME_DEFAULT,
  acceptanceDate: '', acceptancePlace: '',
});

const num = (n: number | null | undefined) => (n ? String(n) : '');
const day = (s: string | null | undefined) => (s ? s.slice(0, 10) : '');

function offerToForm(o: OfferLetter): FormState {
  return {
    employeeId: o.employeeId ?? '', salutation: o.salutation ?? '', candidateName: o.candidateName, candidateEmail: o.candidateEmail,
    candidatePhone: o.candidatePhone, candidateAddress: o.candidateAddress, department: o.department, designation: o.designation,
    employmentType: o.employmentType, workLocation: o.workLocation, reportingManager: o.reportingManager,
    joiningDate: day(o.joiningDate), issueDate: day(o.issueDate), validUntil: day(o.validUntil),
    monthlyGross: num(o.monthlyGross), basicSalary: num(o.basicSalary), hra: num(o.hra), specialAllowance: num(o.specialAllowance),
    annualCtc: num(o.annualCtc), benefits: o.benefits, incentives: o.incentives, probationPeriod: o.probationPeriod,
    workingHours: o.workingHours, additionalTerms: o.additionalTerms, hrName: o.hrName,
    // Older offers have no acceptance fields — treat as not yet recorded.
    acceptanceDate: day(o.acceptanceDate), acceptancePlace: o.acceptancePlace ?? '',
  };
}

const contentFor = (o: OfferLetter) => buildOfferLetter(normalizeOfferInput(offerToForm(o)));

/** True when the saved record does not hold the acceptance details that were sent (never fail silently). */
const acceptanceNotSaved = (o: OfferLetter, sent: { acceptanceDate: string; acceptancePlace: string }) =>
  day(o.acceptanceDate) !== sent.acceptanceDate || (o.acceptancePlace ?? '') !== sent.acceptancePlace;
const NOT_SAVED_MSG = 'The server did not store the Acceptance Date/Place. Restart the server and save again.';

// ── Styles (match the existing HR pages) ─────────────────────────────────────
const inp: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, color: 'var(--fg)', background: 'var(--bg-2)',
  border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' };
const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnSec: React.CSSProperties = { padding: '6px 12px', fontSize: 12, color: 'var(--fg-2)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnSmall: React.CSSProperties = { ...btnSec, padding: '3px 8px', fontSize: 11 };
const errText: React.CSSProperties = { fontSize: 11, color: '#f87171' };

const STATUS_STYLE: Record<OfferStatus, { bg: string; fg: string }> = {
  draft: { bg: '#e5e7eb', fg: '#374151' }, sent: { bg: '#dbeafe', fg: '#1e40af' }, accepted: { bg: '#dcfce7', fg: '#166534' },
  declined: { bg: '#fee2e2', fg: '#991b1b' }, expired: { bg: '#fef9c3', fg: '#854d0e' }, revoked: { bg: '#f3e8ff', fg: '#6b21a8' },
};
const ACTION_LABEL: Record<OfferStatus, string> = {
  draft: 'Draft', sent: 'Mark as Sent', accepted: 'Mark Accepted', declined: 'Mark Declined', expired: 'Mark Expired', revoked: 'Revoke Offer',
};

function StatusBadge({ status }: { status: OfferStatus }) {
  const st = STATUS_STYLE[status];
  return <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: st.bg, color: st.fg, whiteSpace: 'nowrap' }}>{OFFER_STATUS_LABEL[status]}</span>;
}

function fmtDay(s: string) {
  const d = day(s);
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}-${m}-${y}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OfferLettersPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  // List, search, filters
  const [offers, setOffers] = useState<OfferLetter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [facets, setFacets] = useState<{ departments: string[]; designations: string[] }>({ departments: [], designations: [] });
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [fDept, setFDept] = useState('');
  const [fDesig, setFDesig] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // Form (create / edit draft)
  const [form, setForm] = useState<FormState>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Selected saved offer (view)
  const [selected, setSelected] = useState<OfferLetter | null>(null);
  const [busy, setBusy] = useState('');
  const [pendingPrint, setPendingPrint] = useState(false);

  // Acceptance details of an issued (sent/accepted) offer — the only fields still editable.
  const [acc, setAcc] = useState({ acceptanceDate: '', acceptancePlace: '' });
  const [accErrors, setAccErrors] = useState<Record<string, string>>({});

  const loadEmployees = useCallback(async () => {
    try { setEmployees((await adminApi.employees({ limit: '100' })).data); } catch { /* employee picker is optional */ }
  }, []);

  const loadOffers = useCallback(async () => {
    setListLoading(true); setListError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (qDebounced) params.q = qDebounced;
      if (fDept) params.department = fDept;
      if (fDesig) params.designation = fDesig;
      if (fStatus) params.status = fStatus;
      const r = await adminApi.offerLetters(params);
      setOffers(r.data); setTotal(r.meta.total); setPages(r.meta.pages); setFacets(r.facets);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Could not load offer letters.');
    } finally { setListLoading(false); }
  }, [page, qDebounced, fDept, fDesig, fStatus]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);
  useEffect(() => { loadOffers(); }, [loadOffers]);
  useEffect(() => { const t = setTimeout(() => { setQDebounced(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);

  // Print once the selected offer is rendered into the print root.
  // (The flag is reset inside the timer: resetting it first would re-run this
  // effect and its cleanup would cancel the pending print.)
  useEffect(() => {
    if (!pendingPrint || !selected) return;
    const t = setTimeout(() => { setPendingPrint(false); window.print(); }, 50);
    return () => clearTimeout(t);
  }, [pendingPrint, selected]);

  // Load the saved acceptance details whenever another offer (or a fresh copy) is selected.
  useEffect(() => {
    setAcc({ acceptanceDate: day(selected?.acceptanceDate), acceptancePlace: selected?.acceptancePlace ?? '' });
    setAccErrors({});
  }, [selected]);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function handleEmployee(id: string) {
    const emp = employees.find((e) => e._id === id);
    if (!emp) { set('employeeId', ''); return; }
    const monthly = (emp.basicSalary || 0) + (emp.hra || 0) + (emp.specialAllowance || 0);
    setForm((f) => ({
      ...f, employeeId: emp._id, candidateName: emp.name, candidateEmail: emp.email || '', candidatePhone: emp.phone || '',
      candidateAddress: emp.address || '', department: emp.department || f.department, designation: emp.designation || f.designation,
      workLocation: emp.workLocation || f.workLocation,
      monthlyGross: monthly ? String(monthly) : f.monthlyGross,
      basicSalary: emp.basicSalary ? String(emp.basicSalary) : '', hra: emp.hra ? String(emp.hra) : '',
      specialAllowance: emp.specialAllowance ? String(emp.specialAllowance) : '',
      // A different candidate: never carry over another candidate's acceptance details.
      acceptanceDate: '', acceptancePlace: '',
    }));
  }

  function resetForm() {
    setForm(blankForm()); setEditingId(null); setFieldErrors({}); setErr(''); setMsg('');
  }

  function startNewOffer() {
    if (formDirty && !confirm('Discard unsaved changes to this draft?')) return;
    resetForm(); setSelected(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setMsg(''); setErr('');
    const input = normalizeOfferInput(form);
    const errors = validateOfferInput(input, form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) { setErr('Please correct the highlighted fields.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      const r = editingId ? await adminApi.updateOfferLetter(editingId, payload) : await adminApi.createOfferLetter(payload);
      setEditingId(r.data._id); setSelected(r.data);
      loadOffers();
      if (acceptanceNotSaved(r.data, input)) { setErr(NOT_SAVED_MSG); return; }
      setMsg(editingId ? `Draft ${r.data.offerNumber} updated.` : `Draft ${r.data.offerNumber} created.`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Save failed.');
    } finally { setSaving(false); }
  }

  async function openOffer(id: string, opts: { edit?: boolean; print?: boolean } = {}) {
    setErr(''); setMsg('');
    try {
      const { data } = await adminApi.offerLetter(id);
      setSelected(data);
      if (opts.edit && data.status === 'draft') { setForm(offerToForm(data)); setEditingId(data._id); setFieldErrors({}); }
      if (opts.print) setPendingPrint(true);
      return data;
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load the offer letter.');
      return null;
    }
  }

  async function handleDownload(o: OfferLetter) {
    setBusy(`pdf:${o._id}`); setErr('');
    try {
      const { data } = await adminApi.offerLetter(o._id); // always render the saved record
      await downloadOfferLetterPdf(contentFor(data), `STS-OfferLetter-${safeFileSegment(data.offerNumber)}-${safeFileSegment(data.candidateName)}.pdf`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not generate the PDF.');
    } finally { setBusy(''); }
  }

  async function handleStatus(o: OfferLetter, next: OfferStatus) {
    const terminal = next !== 'sent';
    if (editingId === o._id && formDirty && !confirm('You have unsaved changes to this draft. They will be discarded. Continue?')) return;
    if (terminal && !confirm(`${ACTION_LABEL[next]} for ${o.offerNumber} (${o.candidateName})? This cannot be undone.`)) return;
    setBusy(`status:${o._id}`); setErr(''); setMsg('');
    try {
      const { data } = await adminApi.setOfferLetterStatus(o._id, next);
      setSelected(data);
      if (editingId === data._id && data.status !== 'draft') resetForm();
      setMsg(`${data.offerNumber} is now ${OFFER_STATUS_LABEL[data.status].toLowerCase()}.`);
      loadOffers();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Status update failed.');
    } finally { setBusy(''); }
  }

  async function handleSaveAcceptance(o: OfferLetter) {
    setMsg(''); setErr('');
    const input = normalizeOfferInput({ ...offerToForm(o), ...acc });
    const errors = validateAcceptance(input, acc);
    setAccErrors(errors);
    if (Object.keys(errors).length) { setErr('Please correct the acceptance details.'); return; }
    setBusy(`acc:${o._id}`);
    try {
      // Only the acceptance fields are sent; the offer status is not changed.
      const { data } = await adminApi.updateOfferLetter(o._id, { acceptanceDate: input.acceptanceDate, acceptancePlace: input.acceptancePlace });
      setSelected(data);
      if (acceptanceNotSaved(data, input)) { setErr(NOT_SAVED_MSG); return; }
      setMsg(`Acceptance details saved for ${data.offerNumber}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save the acceptance details.');
    } finally { setBusy(''); }
  }

  async function handleDelete(o: OfferLetter) {
    if (!confirm(`Delete draft ${o.offerNumber} for ${o.candidateName}?`)) return;
    setBusy(`del:${o._id}`); setErr('');
    try {
      await adminApi.deleteOfferLetter(o._id);
      if (selected?._id === o._id) setSelected(null);
      if (editingId === o._id) resetForm();
      setMsg(`Draft ${o.offerNumber} deleted.`);
      loadOffers();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed.');
    } finally { setBusy(''); }
  }

  // Live preview of the form while creating/editing; otherwise the selected saved offer.
  const formPreview = useMemo(() => {
    const input = normalizeOfferInput(form);
    if (!input.candidateName && !input.designation) return null;
    return buildOfferLetter(input);
  }, [form]);
  const editingSelected = Boolean(selected && editingId === selected._id);
  const formDirty = editingSelected && selected ? JSON.stringify(form) !== JSON.stringify(offerToForm(selected)) : false;
  // Toolbar actions always act on the SAVED offer (also while its draft is being edited).
  const viewing = selected;
  const previewContent = selected && !editingSelected ? contentFor(selected) : formPreview;
  const printContent = selected ? contentFor(selected) : null;
  const today = todayLocalISO();

  const field = (k: keyof FormState, label: string, node: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
      <label htmlFor={`ol-${k}`} style={lbl}>{label}</label>
      {node}
      {fieldErrors[k] && <span style={errText}>{fieldErrors[k]}</span>}
    </div>
  );
  const text = (k: keyof FormState, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) =>
    field(k, label, <input id={`ol-${k}`} style={{ ...inp, borderColor: fieldErrors[k] ? '#f87171' : undefined }} value={form[k]} onChange={(e) => set(k, e.target.value)} {...props} />);
  const area = (k: keyof FormState, label: string, placeholder = '') =>
    field(k, label, <textarea id={`ol-${k}`} style={{ ...inp, resize: 'vertical', minHeight: 56 }} value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} />);
  // Positional children (not an array), so React needs no keys.
  const row = (...children: React.ReactNode[]) => createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, ...children);

  const monthly = Number(form.monthlyGross) || 0;

  return (
    <>
      <style>{OFFER_PRINT_CSS}</style>
      <OfferPrintRoot content={printContent} />

      <div className="admin-split" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* ── LEFT: create / edit form ─────────────────────────────────── */}
        <div className="admin-split-side" style={{ width: 360, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{editingId ? `Edit Draft ${selected?.offerNumber ?? ''}` : 'Create Offer Letter'}</span>
            <button type="button" onClick={startNewOffer} style={btnSmall}>New Offer</button>
          </div>

          <form onSubmit={handleSave} noValidate style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={sectionTitle}>A. Candidate Details</div>
            {field('employeeId', 'Existing employee (optional)',
              <select id="ol-employeeId" style={inp} value={form.employeeId} onChange={(e) => handleEmployee(e.target.value)}>
                <option value="">— New candidate (not yet an employee) —</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.name} ({e.employeeId || e._id.slice(-6)})</option>)}
              </select>)}
            {row(
              field('salutation', 'Salutation', (
                <select id="ol-salutation" style={inp} value={form.salutation} onChange={(e) => set('salutation', e.target.value)}>
                  <option value="">—</option><option value="Mr.">Mr.</option><option value="Ms.">Ms.</option><option value="Mrs.">Mrs.</option>
                </select>
              )),
              <div style={{ flex: 3, minWidth: 160, display: 'flex' }}>{text('candidateName', 'Full name *', { maxLength: 120 })}</div>,
            )}
            {row(text('candidateEmail', 'Email', { type: 'email', maxLength: 120 }), text('candidatePhone', 'Phone', { type: 'tel', maxLength: 20 }))}
            {area('candidateAddress', 'Residential address', 'One line per address line')}

            <div style={sectionTitle}>B. Job Details</div>
            {row(text('department', 'Department *', { list: 'ol-departments', maxLength: 120 }), text('designation', 'Designation *', { list: 'ol-designations', maxLength: 120 }))}
            <datalist id="ol-departments">{['Engineering', 'Design', 'Sales', 'Marketing', 'Human Resources', 'Finance', 'Operations', 'Training', ...facets.departments].filter((v, i, a) => a.indexOf(v) === i).map((d) => <option key={d} value={d} />)}</datalist>
            <datalist id="ol-designations">{['Software Engineer', 'Senior Software Engineer', 'Full Stack Developer', 'UI/UX Designer', 'Project Manager', 'HR Executive', 'Accountant', 'Trainer', 'Intern', ...facets.designations].filter((v, i, a) => a.indexOf(v) === i).map((d) => <option key={d} value={d} />)}</datalist>
            {row(
              field('employmentType', 'Employment type *', (
                <select id="ol-employmentType" style={{ ...inp, borderColor: fieldErrors.employmentType ? '#f87171' : undefined }} value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)}>
                  <option value="">— Select —</option>
                  {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )),
              text('reportingManager', 'Reporting manager', { maxLength: 120 }),
            )}
            {text('workLocation', 'Work location (blank = company address)', { maxLength: 240 })}
            {row(text('issueDate', 'Offer issue date *', { type: 'date' }), text('joiningDate', 'Proposed joining date *', { type: 'date' }))}
            {text('validUntil', 'Offer valid until (acceptance deadline) *', { type: 'date' })}

            <div style={sectionTitle}>C. Compensation (₹)</div>
            {text('monthlyGross', 'Monthly gross salary *', { type: 'number', min: 0, inputMode: 'numeric' })}
            {row(text('basicSalary', 'Basic / month', { type: 'number', min: 0 }), text('hra', 'HRA / month', { type: 'number', min: 0 }), text('specialAllowance', 'Special allow. / month', { type: 'number', min: 0 }))}
            {fieldErrors.salaryComponents && <span style={errText}>{fieldErrors.salaryComponents}</span>}
            {monthly > 0 && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>Annual gross shown in the letter: ₹{formatRupees(monthly * 12)} (12 × monthly gross). Components are optional; if entered they must add up to the monthly gross.</span>}
            {text('annualCtc', 'Annual CTC (optional — enter only if defined)', { type: 'number', min: 0 })}
            {area('benefits', 'Benefits (optional)', 'e.g. health insurance as per Company policy')}
            {area('incentives', 'Incentives (optional)')}

            <div style={sectionTitle}>D. Terms</div>
            {row(text('probationPeriod', 'Probation period', { maxLength: 60 }), text('workingHours', 'Working hours', { maxLength: 120, placeholder: 'e.g. 9:30 AM to 6:30 PM, Mon–Fri' }))}
            {area('additionalTerms', 'Other offer-specific terms (optional)')}
            {text('hrName', 'Authorised signatory (HR)', { maxLength: 120 })}

            <div style={sectionTitle}>E. Candidate Acceptance (optional)</div>
            {row(
              text('acceptanceDate', 'Acceptance Date', { type: 'date' }),
              text('acceptancePlace', 'Place', { maxLength: OFFER_LIMITS.place, placeholder: 'e.g. Asansol' }),
            )}
            <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>Fill in once the candidate accepts; shown in the letter&apos;s acceptance section. Leave blank to print empty lines. This does not change the offer status.</span>

            {err && <div role="alert" style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#991b1b' }}>{err}</div>}
            {msg && <div role="status" style={{ padding: '8px 12px', background: '#dcfce7', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#166534' }}>{msg}</div>}

            <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : editingId ? 'Update Draft' : 'Save as Draft'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>Offers are saved as drafts. Mark an offer as Sent once it is issued — after that its details can no longer be edited.</span>
          </form>
        </div>

        {/* ── RIGHT: preview + list ────────────────────────────────────── */}
        <div className="admin-split-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Preview toolbar */}
          <div id="offer-toolbar" style={{ padding: '8px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {viewing ? (
              <>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{viewing.offerNumber}</span>
                <StatusBadge status={viewing.status} />
                {viewing.status === 'sent' && isDeadlinePassed(viewing.validUntil, today) && <span style={{ fontSize: 11, color: '#f59e0b' }}>Deadline passed</span>}
                {editingSelected && (
                  <span style={{ fontSize: 11, color: formDirty ? '#f59e0b' : 'var(--fg-4)' }}>
                    {formDirty ? 'Unsaved changes — Download/Print use the saved draft until you update it.' : 'Editing draft'}
                  </span>
                )}
                <span style={{ flex: 1 }} />
                <button type="button" style={btnSec} disabled={!!busy} onClick={() => handleDownload(viewing)}>{busy === `pdf:${viewing._id}` ? 'Generating…' : 'Download PDF'}</button>
                <button type="button" style={btnSec} onClick={() => window.print()}>Print</button>
                {viewing.status === 'draft' && !editingSelected && <button type="button" style={btnSec} onClick={() => openOffer(viewing._id, { edit: true })}>Edit</button>}
                {OFFER_TRANSITIONS[viewing.status].map((next) => {
                  const blocked = next === 'expired' && !isDeadlinePassed(viewing.validUntil, today);
                  return (
                    <button key={next} type="button" disabled={!!busy || blocked} title={blocked ? 'Available after the acceptance deadline' : undefined}
                      style={{ ...btnSec, opacity: blocked ? 0.45 : 1, color: next === 'revoked' || next === 'declined' ? '#f87171' : undefined }}
                      onClick={() => handleStatus(viewing, next)}>
                      {ACTION_LABEL[next]}
                    </button>
                  );
                })}
              </>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                {previewContent ? 'Live preview of the form — save the draft to download or print.' : 'Fill in the form, or choose an offer below to view it.'}
              </span>
            )}
          </div>

          {/* Acceptance details of an issued offer (the rest of its content is frozen) */}
          {viewing && viewing.status !== 'draft' && ACCEPTANCE_EDITABLE_STATUSES.includes(viewing.status) && (
            <div id="offer-acceptance" style={{ padding: '8px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
                <label htmlFor="olacc-date" style={lbl}>Acceptance Date</label>
                <input id="olacc-date" type="date" style={{ ...inp, borderColor: accErrors.acceptanceDate ? '#f87171' : undefined }} value={acc.acceptanceDate}
                  onChange={(e) => setAcc((a) => ({ ...a, acceptanceDate: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 160px', minWidth: 0 }}>
                <label htmlFor="olacc-place" style={lbl}>Place</label>
                <input id="olacc-place" style={{ ...inp, borderColor: accErrors.acceptancePlace ? '#f87171' : undefined }} value={acc.acceptancePlace} maxLength={OFFER_LIMITS.place} placeholder="e.g. Asansol"
                  onChange={(e) => setAcc((a) => ({ ...a, acceptancePlace: e.target.value }))} />
              </div>
              <button type="button" style={btnSec} disabled={!!busy} onClick={() => handleSaveAcceptance(viewing)}>
                {busy === `acc:${viewing._id}` ? 'Saving…' : 'Save Acceptance Details'}
              </button>
              {(accErrors.acceptanceDate || accErrors.acceptancePlace) && (
                <span style={{ ...errText, flexBasis: '100%' }}>{[accErrors.acceptanceDate, accErrors.acceptancePlace].filter(Boolean).join(' ')}</span>
              )}
              <span style={{ fontSize: 11, color: 'var(--fg-4)', flexBasis: '100%' }}>Printed in the candidate acceptance section. Saving these does not change the offer status.</span>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#e8e8e8', minHeight: 0 }}>
            {!OFFER_TEMPLATE_APPROVED && (
              <div role="note" style={{ maxWidth: 760, margin: '0 auto 12px', padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#854d0e' }}>
                The offer letter wording is a draft template pending HR/legal approval. Review the terms before issuing offers.
              </div>
            )}
            {previewContent ? (
              <div id="offer-screen-preview" style={{ background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', borderRadius: 4, padding: '24px 28px', maxWidth: 760, margin: '0 auto', overflow: 'hidden' }}>
                <OfferLetterHtml content={previewContent} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontSize: 13 }}>No offer selected</div>
            )}
          </div>

          {/* List: search, filters, table */}
          <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-1)', flexShrink: 0, maxHeight: 340, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Offer Letters <span style={{ color: 'var(--fg-4)', fontWeight: 400, fontSize: 12 }}>({total})</span></span>
              <input aria-label="Search offer letters" placeholder="Search name, employee ID or offer no." value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inp, width: 'auto', flex: '1 1 200px', padding: '5px 9px', fontSize: 12 }} />
              <select aria-label="Filter by department" value={fDept} onChange={(e) => { setFDept(e.target.value); setPage(1); }} style={{ ...inp, width: 'auto', padding: '5px 8px', fontSize: 12 }}>
                <option value="">All departments</option>{facets.departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select aria-label="Filter by designation" value={fDesig} onChange={(e) => { setFDesig(e.target.value); setPage(1); }} style={{ ...inp, width: 'auto', padding: '5px 8px', fontSize: 12 }}>
                <option value="">All designations</option>{facets.designations.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select aria-label="Filter by status" value={fStatus} onChange={(e) => { setFStatus(e.target.value); setPage(1); }} style={{ ...inp, width: 'auto', padding: '5px 8px', fontSize: 12 }}>
                <option value="">All statuses</option>{OFFER_STATUSES.map((s) => <option key={s} value={s}>{OFFER_STATUS_LABEL[s]}</option>)}
              </select>
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
                <div role="alert" style={{ padding: 16, fontSize: 12, color: '#f87171' }}>{listError} <button type="button" style={btnSmall} onClick={loadOffers}>Retry</button></div>
              ) : offers.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: 'var(--fg-4)' }}>{qDebounced || fDept || fDesig || fStatus ? 'No offer letters match these filters.' : 'No offer letters yet. Create one with the form.'}</div>
              ) : (
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-2)' }}>
                      {['Offer No.', 'Candidate', 'Designation', 'Department', 'Joining', 'Valid until', 'Status', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-4)', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((o) => (
                      <tr key={o._id} style={{ borderBottom: '1px solid var(--line)', background: selected?._id === o._id ? 'rgba(45,54,217,0.06)' : 'transparent' }}>
                        <td style={{ padding: '7px 12px', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono, monospace)', fontSize: 11 }}>{o.offerNumber}</td>
                        <td style={{ padding: '7px 12px', fontWeight: 500 }}>{o.candidateName}{o.employeeCode && <span style={{ color: 'var(--fg-4)', fontWeight: 400 }}> · {o.employeeCode}</span>}</td>
                        <td style={{ padding: '7px 12px' }}>{o.designation}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--fg-3)' }}>{o.department}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{fmtDay(o.joiningDate)}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{fmtDay(o.validUntil)}</td>
                        <td style={{ padding: '7px 12px' }}><StatusBadge status={o.status} /></td>
                        <td style={{ padding: '7px 12px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                            <button type="button" style={btnSmall} onClick={() => openOffer(o._id)}>View</button>
                            {o.status === 'draft' && <button type="button" style={btnSmall} onClick={() => openOffer(o._id, { edit: true })}>Edit</button>}
                            <button type="button" style={{ ...btnSmall, color: '#16a34a', borderColor: '#86efac' }} disabled={!!busy} onClick={() => handleDownload(o)}>PDF</button>
                            <button type="button" style={btnSmall} onClick={() => openOffer(o._id, { print: true })}>Print</button>
                            {o.status === 'draft' && <button type="button" style={{ ...btnSmall, color: '#ef4444', borderColor: '#fca5a5' }} disabled={!!busy} onClick={() => handleDelete(o)}>Del</button>}
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
