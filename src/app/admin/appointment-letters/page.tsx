'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { adminApi, Employee, AppointmentLetter } from '@/lib/adminApi';
import {
  COMPANY_NAME, COMPANY_ADDRESS, COMPANY_PHONE, COMPANY_EMAIL, COMPANY_WEBSITE,
  LOGO_MARK_BASE64, SIGNATURE_BASE64, HR_NAME_DEFAULT,
} from '@/lib/hrConstants';
import {
  buildAppointmentLetter, localISODate, safeFileSegment,
  type AppointmentLetterContent, type LetterRun, type Salutation,
} from '@/lib/appointmentLetter';
import { downloadAppointmentLetterPdf } from '@/lib/appointmentLetterPdf';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Print CSS ─────────────────────────────────────────────────────────────────
const PRINT_CSS = `
@media print {
  body > *:not(#letter-print-area) { display: none !important; }
  #letter-print-area { display: block !important; position: fixed; inset: 0; background: #fff; z-index: 99999; padding: 0; }
  @page { size: A4; margin: 14mm 16mm; }
}
@media screen { #letter-print-area { display: none; } }
`;

// ── Appointment Letter Document (on-screen preview) ───────────────────────────
// Renders the same content model as the downloaded PDF (lib/appointmentLetterPdfDoc.tsx),
// laid out like the company's reference letter.
function Runs({ runs }: { runs: LetterRun[] }) {
  return (
    <>
      {runs.map((r, i) => {
        let node: React.ReactNode = r.text;
        if (r.sup) node = <sup>{node}</sup>;
        if (r.underline) node = <u>{node}</u>;
        if (r.bold) node = <strong>{node}</strong>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

function LetterDoc({ content: c }: { content: AppointmentLetterContent }) {
  const para: React.CSSProperties = { marginTop: 14, textAlign: 'justify' };
  const link: React.CSSProperties = { color: '#0563C1', textDecoration: 'underline' };

  return (
    <div style={{ fontFamily: '"Times New Roman", Times, serif', background: '#fff', color: '#000', fontSize: 15, lineHeight: 1.2, width: '100%', maxWidth: 750, margin: '0 auto' }}>

      {/* Letterhead */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_MARK_BASE64} alt="" style={{ height: 60, width: 'auto', display: 'block' }} />
          <span style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 700, fontSize: 22, color: '#404040', letterSpacing: '0.02em', marginTop: 6 }}>TEP TO SOFT</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>{COMPANY_PHONE}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={link}>{COMPANY_EMAIL}</span></div>
          <div style={link}>{COMPANY_WEBSITE}</div>
        </div>
      </div>

      {/* Date and recipient */}
      <div style={{ marginTop: 36, fontSize: 14 }}>
        <div>Date: {c.issueDate}</div>
        <div>{c.recipient.name}</div>
        {c.recipient.addressLines.map((line, i) => <div key={i}>{line}</div>)}
        {c.recipient.email && <div>Email:{c.recipient.email}</div>}
        {c.recipient.phone && <div>Cell: {c.recipient.phone}</div>}
      </div>

      <div style={{ marginTop: 40, textAlign: 'center', fontWeight: 700, textDecoration: 'underline' }}>{c.title}</div>
      <div style={{ marginTop: 10 }}>{c.salutation}</div>
      <div style={para}><Runs runs={c.opening} /></div>

      {/* Numbered clauses */}
      {c.clauses.map((cl, i) => (
        <div key={i} style={{ marginTop: 14 }}>
          <div><Runs runs={cl.heading} /></div>
          {cl.paragraphs.map((p, j) => (
            <div key={j} style={{ textAlign: 'justify', whiteSpace: 'pre-line', marginTop: j > 0 || cl.gapAfterHeading ? 14 : 0 }}><Runs runs={p} /></div>
          ))}
        </div>
      ))}

      {/* Closing and HR signatory */}
      <div style={{ marginTop: 8 }}>{c.thanking}</div>
      <div style={{ marginTop: 14 }}>
        <div>{c.signOff}</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SIGNATURE_BASE64} alt="HR signature" style={{ height: 40, width: 'auto', display: 'block', margin: '6px 0 3px' }} />
        <div>({c.signatory.name})</div>
        <div style={{ marginLeft: 55 }}>{c.signatory.designation}</div>
      </div>

      {/* Employee acceptance */}
      <div style={{ marginTop: 26, textAlign: 'justify' }}><Runs runs={c.acceptance} /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 44 }}>
        <div style={{ width: 170, borderTop: '1px solid #000', paddingTop: 4, textAlign: 'center' }}>Signature</div>
      </div>
      <div style={{ marginTop: 18 }}>
        <div>Date: {c.acceptanceDate || '____________________'}</div>
        <div>Place: {c.acceptancePlace || '___________________'}</div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 28, borderTop: '1px solid #bbb', paddingTop: 6, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 10, color: '#6b6b6b' }}>
        {COMPANY_NAME} &nbsp;·&nbsp; {COMPANY_ADDRESS}
      </div>
    </div>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────
interface LetterForm {
  employeeId: string;
  /** Letter issue date for the "Date:" line — the record's creation date, or today for a new letter (not editable). */
  issueDate: string;
  salutation: Salutation;
  interviewDate: string;
  offerDate: string;
  joiningDate: string;
  designation: string;
  department: string;
  salary: number;
  workLocation: string;
  probationPeriod: string;
  hrName: string;
  customTerms: string;
  /** Employee acceptance section (YYYY-MM-DD) — not the joining or issue date. */
  acceptanceDate: string;
  acceptancePlace: string;
}

const BLANK_FORM: LetterForm = {
  employeeId: '',
  issueDate: localISODate(),
  salutation: '',
  interviewDate: '',
  offerDate: todayISO(),
  joiningDate: '',
  designation: '',
  department: '',
  salary: 0,
  workLocation: '',
  probationPeriod: '3 (Three) months',
  hrName: HR_NAME_DEFAULT,
  customTerms: '',
  acceptanceDate: '',
  acceptancePlace: '',
};

function letterToForm(lt: AppointmentLetter, emp: Employee): LetterForm {
  return {
    employeeId:     emp._id,
    issueDate:      lt.createdAt ? lt.createdAt.slice(0, 10) : localISODate(),
    salutation:     lt.salutation ?? '',
    interviewDate:  lt.interviewDate ? lt.interviewDate.slice(0, 10) : '',
    offerDate:      lt.offerDate ? lt.offerDate.slice(0, 10) : todayISO(),
    joiningDate:    lt.joiningDate ? lt.joiningDate.slice(0, 10) : '',
    designation:    lt.designation,
    department:     lt.department,
    salary:         lt.salary,
    workLocation:   lt.workLocation,
    probationPeriod:lt.probationPeriod,
    hrName:         lt.hrName,
    customTerms:    lt.customTerms,
    acceptanceDate: lt.acceptanceDate ? lt.acceptanceDate.slice(0, 10) : '',
    acceptancePlace:lt.acceptancePlace ?? '',
  };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, color: 'var(--fg)', background: 'var(--bg-2)',
  border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none',
  width: '100%', boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff',
  background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnSec: React.CSSProperties = {
  padding: '8px 12px', fontSize: 12, color: 'var(--fg-2)', background: 'var(--bg-2)',
  border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnDanger: React.CSSProperties = {
  padding: '3px 8px', fontSize: 11, color: '#ef4444', background: 'transparent',
  border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer',
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AppointmentLettersPage() {
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [letters, setLetters]         = useState<AppointmentLetter[]>([]);
  const [letterTotal, setLetterTotal] = useState(0);
  const [letterPage, setLetterPage]   = useState(1);
  const [letterPages, setLetterPages] = useState(1);
  const [loading, setLoading]         = useState(false);
  const [form, setForm]               = useState<LetterForm>(BLANK_FORM);
  const [saving, setSaving]           = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saveMsg, setSaveMsg]         = useState('');
  const [saveErr, setSaveErr]         = useState('');
  const [previewEmp, setPreviewEmp]   = useState<Employee | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);

  const loadEmps = useCallback(async () => {
    try {
      const r = await adminApi.employees({ limit: '100' });
      setEmployees(r.data);
    } catch { /* silent */ }
  }, []);

  const loadLetters = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.appointmentLetters({ page: String(letterPage), limit: '10' });
      setLetters(r.data); setLetterTotal(r.meta.total); setLetterPages(r.meta.pages);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [letterPage]);

  useEffect(() => { loadEmps(); }, [loadEmps]);
  useEffect(() => { loadLetters(); }, [loadLetters]);

  function set<K extends keyof LetterForm>(k: K, v: LetterForm[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleEmpChange(id: string) {
    set('employeeId', id);
    // Acceptance date/place belong to one employee's letter — never carry them over.
    setForm(f => ({ ...f, acceptanceDate: '', acceptancePlace: '' }));
    const emp = employees.find(e => e._id === id);
    if (emp) {
      setPreviewEmp(emp);
      if (emp.designation)  set('designation', emp.designation);
      if (emp.department)   set('department',  emp.department);
      if (emp.workLocation) set('workLocation', emp.workLocation);
      const total = (emp.basicSalary || 0) + (emp.hra || 0) + (emp.specialAllowance || 0);
      if (total > 0) set('salary', total);
      // Take the joining date from this employee's record; with none on file,
      // clear it so the previous employee's date can never carry over.
      set('joiningDate', emp.joiningDate ? emp.joiningDate.slice(0, 10) : '');
    }
  }

  function loadLetterIntoForm(lt: AppointmentLetter) {
    const emp = typeof lt.employeeId === 'object'
      ? (lt.employeeId as Employee)
      : employees.find(e => e._id === lt.employeeId) ?? null;
    if (!emp) return;
    setPreviewEmp(emp);
    setForm(letterToForm(lt, emp));
  }

  function handleEdit(lt: AppointmentLetter) {
    loadLetterIntoForm(lt);
    setEditingId(lt._id);
    setSaveMsg(''); setSaveErr('');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(BLANK_FORM);
    setPreviewEmp(null);
    setSaveMsg(''); setSaveErr('');
  }

  async function handleHistoryDownload(lt: AppointmentLetter) {
    if (downloading) return;
    setSaveErr(''); setSaveMsg('');
    setDownloading(true);
    try {
      // The history list embeds only part of the employee record (no phone);
      // load the full saved letter so the PDF carries complete contact details.
      const { data: full } = await adminApi.appointmentLetter(lt._id);
      const emp = full.employeeId && typeof full.employeeId === 'object' ? (full.employeeId as Employee) : null;
      if (!emp) throw new Error('The employee for this letter could not be found.');
      const letterForm = letterToForm(full, emp);
      // Show the letter in the preview as before — unless another letter is
      // being edited, whose unsaved changes must not be overwritten.
      if (!editingId) { setPreviewEmp(emp); setForm(letterForm); }
      await generatePdf(emp, letterForm, editingId === lt._id ? lt._id : null);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Could not load this letter.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaveMsg(''); setSaveErr('');
    if (!form.employeeId)  { setSaveErr('Select an employee'); return; }
    if (!form.joiningDate) { setSaveErr('Set a joining date'); return; }
    if (!form.designation) { setSaveErr('Enter designation'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updateAppointmentLetter(editingId, { ...form });
        setSaveMsg('Letter updated successfully!');
        setEditingId(null);
      } else {
        await adminApi.createAppointmentLetter({ ...form });
        setSaveMsg('Letter saved successfully!');
        setForm(BLANK_FORM);
        setPreviewEmp(null);
      }
      loadLetters();
    } catch (err: unknown) { setSaveErr(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  function handlePrint() {
    if (!previewEmp || !form.joiningDate) return;
    const el = document.getElementById('letter-screen-preview');
    if (!el) return;
    const printArea = document.getElementById('letter-print-area');
    if (!printArea) return;
    printArea.innerHTML = el.innerHTML;
    window.print();
  }

  /**
   * Builds the letter from explicit data and downloads it as a text-based A4
   * PDF. Refuses (with a message) when required data is missing instead of
   * printing placeholders.
   */
  async function generatePdf(emp: Employee, letterForm: LetterForm, letterId: string | null) {
    const content = buildAppointmentLetter(emp, letterForm);
    if (content.missing.required.length) {
      throw new Error(`The letter needs the following before it can be downloaded: ${content.missing.required.join(', ')}.`);
    }
    const empCode = emp.employeeId || emp._id.slice(-6);
    await downloadAppointmentLetterPdf(
      content,
      `STS-AppointmentLetter-${safeFileSegment(empCode)}-${safeFileSegment(letterForm.joiningDate)}.pdf`,
    );
    // Mark as downloaded
    if (letterId) {
      adminApi.updateAppointmentLetter(letterId, { status: 'downloaded' } as Partial<AppointmentLetter>).catch(() => {});
    }
  }

  async function handleDownloadPDF() {
    if (!previewEmp || downloading) return;
    setSaveErr(''); setSaveMsg('');
    setDownloading(true);
    try {
      await generatePdf(previewEmp, { ...form }, editingId);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Could not generate the PDF.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this appointment letter?')) return;
    try {
      await adminApi.deleteAppointmentLetter(id);
      if (editingId === id) handleCancelEdit();
      loadLetters();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  }

  function empName(lt: AppointmentLetter) {
    if (typeof lt.employeeId === 'object' && lt.employeeId !== null) return (lt.employeeId as Employee).name;
    return '—';
  }
  function empEid(lt: AppointmentLetter) {
    if (typeof lt.employeeId === 'object' && lt.employeeId !== null) return (lt.employeeId as Employee).employeeId || '';
    return '';
  }

  const canPreview = Boolean(previewEmp);
  const content = previewEmp ? buildAppointmentLetter(previewEmp, form) : null;

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div id="letter-print-area" />

      <div className="admin-split" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* ── LEFT: Form ──────────────────────────────────────────────── */}
        <div className="admin-split-side" style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {editingId ? 'Edit Letter' : 'Generate Letter'}
            </span>
            {editingId && (
              <button onClick={handleCancelEdit} style={{ ...btnSec, padding: '4px 10px', fontSize: 11 }}>
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSave} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Employee *</label>
              <select style={inp} value={form.employeeId} onChange={e => handleEmpChange(e.target.value)} disabled={!!editingId}>
                <option value="">— Select Employee —</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.employeeId || e._id.slice(-6)})</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Salutation *</label>
                <select style={inp} value={form.salutation} onChange={e => set('salutation', e.target.value as Salutation)}>
                  <option value="">— Select —</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                </select>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Interview Date *</label>
                <input type="date" style={inp} value={form.interviewDate} onChange={e => set('interviewDate', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Offer Letter Date *</label>
                <input type="date" style={inp} value={form.offerDate} onChange={e => set('offerDate', e.target.value)} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Joining Date *</label>
                <input type="date" style={inp} value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Designation *</label>
              <input list="al-designations" style={inp} value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="e.g. Software Engineer" />
              <datalist id="al-designations">
                {['Software Engineer','Senior Software Engineer','Full Stack Developer','React Developer','Node.js Developer','UI/UX Designer','Project Manager','Business Development Executive','HR Executive','Accountant','Trainer','Intern'].map(d => <option key={d} value={d} />)}
              </datalist>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Department</label>
              <input list="al-departments" style={inp} value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Engineering" />
              <datalist id="al-departments">
                {['Engineering','Design','Sales','Marketing','Human Resources','Finance','Operations','Training'].map(d => <option key={d} value={d} />)}
              </datalist>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Monthly Gross Salary (₹)</label>
              <input type="number" style={inp} min={0} value={form.salary} onChange={e => set('salary', Number(e.target.value))} />
              {form.salary > 0 && (
                <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>Letter states annual compensation: Rs. {fmtINR(form.salary * 12)}/-</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Work Location</label>
              <input style={inp} value={form.workLocation} onChange={e => set('workLocation', e.target.value)} placeholder="e.g. Asansol, West Bengal" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Probation Period</label>
              <input list="al-probation" style={inp} value={form.probationPeriod} onChange={e => set('probationPeriod', e.target.value)} />
              <datalist id="al-probation">
                {['1 (One) month','2 (Two) months','3 (Three) months','6 (Six) months','No Probation'].map(p => <option key={p} value={p} />)}
              </datalist>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>HR Name</label>
              <input style={inp} value={form.hrName} onChange={e => set('hrName', e.target.value)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Additional Terms (optional)</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }} value={form.customTerms} onChange={e => set('customTerms', e.target.value)} placeholder="Any special conditions…" />
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee Acceptance Details</div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label htmlFor="al-acceptance-date" style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Acceptance Date</label>
                <input id="al-acceptance-date" type="date" style={inp} value={form.acceptanceDate} onChange={e => set('acceptanceDate', e.target.value)} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label htmlFor="al-acceptance-place" style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Place</label>
                <input id="al-acceptance-place" type="text" style={inp} maxLength={100} value={form.acceptancePlace} onChange={e => set('acceptancePlace', e.target.value)} onBlur={e => set('acceptancePlace', e.target.value.replace(/\s+/g, ' ').trim())} placeholder="Enter city name" />
              </div>
            </div>

            {content && content.missing.required.length > 0 && (
              <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#991b1b' }}>
                Still needed for the letter: {content.missing.required.join(', ')}.
                {content.missing.required.some(r => r.startsWith("employee's")) && ' Employee details are edited on the Employees page.'}
              </div>
            )}
            {content && content.missing.optional.length > 0 && (
              <div style={{ padding: '8px 12px', background: '#fef9c3', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#854d0e' }}>
                Not on this employee&apos;s record, so omitted from the letter: {content.missing.optional.join(', ')}.
              </div>
            )}
            {saveErr && <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#991b1b' }}>{saveErr}</div>}
            {saveMsg && <div style={{ padding: '8px 12px', background: '#dcfce7', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#166534' }}>{saveMsg}</div>}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : editingId ? 'Update Letter' : 'Save Letter'}
                </button>
                <button type="button" onClick={handlePrint} disabled={!canPreview} style={{ ...btnSec, opacity: !canPreview ? 0.4 : 1 }}>
                  Print
                </button>
              </div>
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={!canPreview || downloading}
                style={{
                  ...btnPrimary,
                  background: canPreview && !downloading ? '#16a34a' : '#6b7280',
                  opacity: !canPreview ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {downloading ? 'Generating PDF…' : 'Download PDF'}
              </button>
            </div>

          </form>
        </div>

        {/* ── RIGHT: Preview + History ─────────────────────────────────── */}
        <div className="admin-split-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Preview area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#e8e8e8' }}>
            {previewEmp ? (
              <div
                id="letter-screen-preview"
                style={{ background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', borderRadius: 4, padding: '24px 28px', maxWidth: 760, margin: '0 auto' }}
              >
                {content && <LetterDoc content={content} />}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-4)', fontSize: 13 }}>
                Select an employee to preview the appointment letter
              </div>
            )}
          </div>

          {/* History table */}
          <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-1)', flexShrink: 0, maxHeight: 260, overflowY: 'auto' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>History <span style={{ color: 'var(--fg-4)', fontWeight: 400, fontSize: 12 }}>({letterTotal})</span></span>
              {letterPages > 1 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button style={{ ...btnSec, padding: '3px 10px', fontSize: 11 }} disabled={letterPage <= 1} onClick={() => setLetterPage(p => p - 1)}>Prev</button>
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{letterPage}/{letterPages}</span>
                  <button style={{ ...btnSec, padding: '3px 10px', fontSize: 11 }} disabled={letterPage >= letterPages} onClick={() => setLetterPage(p => p + 1)}>Next</button>
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--fg-4)' }}>Loading…</div>
            ) : letters.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--fg-4)' }}>No letters generated yet.</div>
            ) : (
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-2)' }}>
                    {['Employee','Emp ID','Designation','Offer Date','Joining Date','Salary','Status','Actions'].map(h => (
                      <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-4)', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {letters.map(lt => {
                    const isEditing = editingId === lt._id;
                    return (
                      <tr key={lt._id} style={{ borderBottom: '1px solid var(--line)', background: isEditing ? 'rgba(45,54,217,0.06)' : 'transparent' }}>
                        <td style={{ padding: '7px 12px', fontWeight: 500 }}>{empName(lt)}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--fg-3)' }}>{empEid(lt) || '—'}</td>
                        <td style={{ padding: '7px 12px' }}>{lt.designation}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{fmtDate(lt.offerDate)}</td>
                        <td style={{ padding: '7px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{fmtDate(lt.joiningDate)}</td>
                        <td style={{ padding: '7px 12px' }}>₹{fmtINR(lt.salary)}</td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 500,
                            background: lt.status === 'downloaded' ? '#dcfce7' : lt.status === 'sent' ? '#dbeafe' : '#fef9c3',
                            color:      lt.status === 'downloaded' ? '#166534' : lt.status === 'sent' ? '#1e40af' : '#854d0e',
                          }}>{lt.status}</span>
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                              onClick={() => handleEdit(lt)}
                              style={{ ...btnSec, padding: '3px 8px', fontSize: 11, color: isEditing ? 'var(--accent)' : undefined }}
                            >
                              {isEditing ? 'Editing…' : 'Edit'}
                            </button>
                            <button
                              onClick={() => handleHistoryDownload(lt)}
                              style={{ padding: '3px 8px', fontSize: 11, color: '#16a34a', background: 'transparent', border: '1px solid #86efac', borderRadius: 4, cursor: 'pointer' }}
                            >
                              PDF
                            </button>
                            <button onClick={() => handleDelete(lt._id)} style={btnDanger}>Del</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
