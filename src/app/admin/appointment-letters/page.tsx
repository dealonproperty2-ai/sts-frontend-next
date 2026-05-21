'use client';

import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { adminApi, Employee, AppointmentLetter } from '@/lib/adminApi';
import {
  COMPANY_NAME, COMPANY_ADDRESS, COMPANY_PHONE, COMPANY_EMAIL, COMPANY_WEBSITE,
  SIGNATURE_BASE64, HR_NAME_DEFAULT, HR_TITLE_DEFAULT,
} from '@/lib/hrConstants';

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

// ── Appointment Letter Document ───────────────────────────────────────────────
interface LetterDocProps {
  emp: Employee;
  form: LetterForm;
}

function LetterDoc({ emp, form }: LetterDocProps) {
  const paraStyle: React.CSSProperties = { marginBottom: 12, fontSize: 12, lineHeight: 1.6, color: '#111', textAlign: 'justify' };

  const clauses: Array<{ title: string; content: string }> = [
    {
      title: 'Designation',
      content: `You are being appointed as <strong>${form.designation || '—'}</strong>${form.department ? ` in the <strong>${form.department}</strong> department` : ''}.`,
    },
    {
      title: 'Date of Joining',
      content: `Your date of joining will be <strong>${fmtDate(form.joiningDate) || '—'}</strong>. Please ensure you report to the office on or before this date with all required documents.`,
    },
    {
      title: 'Compensation',
      content: `You will be entitled to a gross monthly salary of <strong>₹${fmtINR(form.salary)}/- (Rupees ${fmtINR(form.salary)} only)</strong>. A detailed salary break-up will be provided separately.`,
    },
    {
      title: 'Work Location',
      content: `Your primary place of work will be at <strong>${form.workLocation || COMPANY_ADDRESS}</strong>. The Company reserves the right to transfer you to any of its offices as per operational requirements.`,
    },
    {
      title: 'Probation Period',
      content: `You will be on probation for a period of <strong>${form.probationPeriod}</strong> from the date of joining. On successful completion, you will be confirmed in the service of the Company.`,
    },
    {
      title: 'Working Hours',
      content: `Your working hours will be as per Company policy, currently <strong>9:00 AM to 6:00 PM, Monday to Saturday</strong>. The Company may revise working hours from time to time.`,
    },
    {
      title: 'Leave Entitlement',
      content: `You will be entitled to leaves as per the Company&apos;s leave policy in force from time to time. Details will be shared at the time of joining.`,
    },
    {
      title: 'Confidentiality &amp; Non-Disclosure',
      content: `You will not, during or after the term of your employment, disclose any confidential information relating to the Company, its clients, employees, or operations without prior written consent.`,
    },
    {
      title: 'Notice Period',
      content: `Either party may terminate this employment by giving <strong>30 (Thirty) days</strong> written notice or payment in lieu thereof. During probation, either party may terminate by giving <strong>7 (Seven) days</strong> notice.`,
    },
    ...(form.customTerms
      ? [{ title: 'Additional Terms', content: form.customTerms }]
      : []),
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#fff', color: '#111', fontSize: 12, width: '100%', maxWidth: 750, margin: '0 auto' }}>

      {/* Letterhead */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #1a1a2e', paddingBottom: 12, marginBottom: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo3.png" alt="Step To Soft" height={48} style={{ objectFit: 'contain' }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', letterSpacing: '0.02em' }}>{COMPANY_NAME}</div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{COMPANY_ADDRESS}</div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
            Ph: {COMPANY_PHONE} &nbsp;|&nbsp; {COMPANY_EMAIL} &nbsp;|&nbsp; {COMPANY_WEBSITE}
          </div>
        </div>
      </div>

      {/* Date & Ref */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#333' }}>Date: <strong>{fmtDate(form.offerDate || todayISO())}</strong></div>
        <div style={{ fontSize: 11, color: '#333', marginTop: 3 }}>
          Ref: STS/HR/APT/{new Date(form.offerDate || todayISO()).getFullYear()}/{emp.employeeId || '—'}
        </div>
      </div>

      {/* Addressee */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 12 }}>{emp.name}</div>
        {emp.fatherName && <div style={{ fontSize: 11, color: '#444' }}>S/o D/o {emp.fatherName}</div>}
        {emp.address && <div style={{ fontSize: 11, color: '#444', whiteSpace: 'pre-line' }}>{emp.address}</div>}
      </div>

      {/* Subject */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, textDecoration: 'underline', color: '#1a1a2e' }}>
          Subject: Appointment Letter
        </div>
      </div>

      {/* Salutation */}
      <div style={{ ...paraStyle, marginBottom: 10 }}>Dear {emp.name},</div>

      {/* Opening */}
      <div style={paraStyle}>
        We are pleased to appoint you as <strong>{form.designation || '—'}</strong>
        {form.department ? ` in the ${form.department} Department` : ''} at <strong>{COMPANY_NAME}</strong>,
        effective <strong>{fmtDate(form.joiningDate) || '—'}</strong>.
        This appointment is subject to the following terms and conditions:
      </div>

      {/* Numbered Clauses */}
      <ol style={{ paddingLeft: 20, margin: 0 }}>
        {clauses.map((c, i) => (
          <li key={i} style={{ marginBottom: 10, fontSize: 12, lineHeight: 1.6, color: '#111' }}>
            <strong>{c.title}: </strong>
            <span dangerouslySetInnerHTML={{ __html: c.content }} />
          </li>
        ))}
      </ol>

      {/* Closing */}
      <div style={{ ...paraStyle, marginTop: 16 }}>
        We welcome you to the <strong>{COMPANY_NAME}</strong> family and look forward to a long and fruitful association.
        Please sign and return the duplicate copy of this letter as a token of your acceptance.
      </div>

      {/* Signature Block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 28 }}>
        <div>
          <div style={{ fontSize: 12, color: '#333', marginBottom: 4 }}>Yours sincerely,</div>
          <div style={{ fontSize: 11, color: '#555' }}>For {COMPANY_NAME}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SIGNATURE_BASE64} alt="Signature" height={50} style={{ objectFit: 'contain', margin: '6px 0', display: 'block' }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{form.hrName || HR_NAME_DEFAULT}</div>
          <div style={{ fontSize: 11, color: '#555' }}>{HR_TITLE_DEFAULT}</div>
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px solid #aaa', paddingTop: 8, width: 200 }}>
          <div style={{ fontSize: 11, color: '#555' }}>Candidate Signature</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{emp.name}</div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Date: _______________</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', color: '#888', fontSize: 10, borderTop: '1px solid #ddd', marginTop: 20, paddingTop: 8 }}>
        {COMPANY_NAME} &nbsp;·&nbsp; {COMPANY_ADDRESS}
      </div>
    </div>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────
interface LetterForm {
  employeeId: string;
  offerDate: string;
  joiningDate: string;
  designation: string;
  department: string;
  salary: number;
  workLocation: string;
  probationPeriod: string;
  hrName: string;
  customTerms: string;
}

const BLANK_FORM: LetterForm = {
  employeeId: '',
  offerDate: todayISO(),
  joiningDate: '',
  designation: '',
  department: '',
  salary: 0,
  workLocation: '',
  probationPeriod: '3 (Three) months',
  hrName: HR_NAME_DEFAULT,
  customTerms: '',
};

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
  const pendingDownload               = useRef(false);

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

  // Trigger PDF download after state settles (used by history row download)
  useEffect(() => {
    if (!pendingDownload.current || !previewEmp || !form.joiningDate) return;
    pendingDownload.current = false;
    const t = setTimeout(() => doDownloadPDF(), 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewEmp, form.joiningDate]);

  function set<K extends keyof LetterForm>(k: K, v: LetterForm[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleEmpChange(id: string) {
    set('employeeId', id);
    const emp = employees.find(e => e._id === id);
    if (emp) {
      setPreviewEmp(emp);
      if (emp.designation)  set('designation', emp.designation);
      if (emp.department)   set('department',  emp.department);
      if (emp.workLocation) set('workLocation', emp.workLocation);
      const total = (emp.basicSalary || 0) + (emp.hra || 0) + (emp.specialAllowance || 0);
      if (total > 0) set('salary', total);
    }
  }

  function loadLetterIntoForm(lt: AppointmentLetter) {
    const emp = typeof lt.employeeId === 'object'
      ? (lt.employeeId as Employee)
      : employees.find(e => e._id === lt.employeeId) ?? null;
    if (!emp) return;
    setPreviewEmp(emp);
    setForm({
      employeeId:     emp._id,
      offerDate:      lt.offerDate ? lt.offerDate.slice(0, 10) : todayISO(),
      joiningDate:    lt.joiningDate ? lt.joiningDate.slice(0, 10) : '',
      designation:    lt.designation,
      department:     lt.department,
      salary:         lt.salary,
      workLocation:   lt.workLocation,
      probationPeriod:lt.probationPeriod,
      hrName:         lt.hrName,
      customTerms:    lt.customTerms,
    });
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

  function handleHistoryDownload(lt: AppointmentLetter) {
    loadLetterIntoForm(lt);
    pendingDownload.current = true;
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

  async function doDownloadPDF() {
    if (!previewEmp) return;
    setDownloading(true);
    try {
      const el = document.getElementById('letter-screen-preview');
      if (!el) return;

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF }   = await import('jspdf');

      const canvas  = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');

      const pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW  = pageW;
      const imgH  = (canvas.height * pageW) / canvas.width;

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

      const empId = previewEmp.employeeId || previewEmp._id.slice(-6);
      pdf.save(`STS-AppointmentLetter-${empId}-${form.joiningDate || form.offerDate}.pdf`);

      // Mark as downloaded
      if (editingId) {
        adminApi.updateAppointmentLetter(editingId, { status: 'downloaded' } as Partial<AppointmentLetter>).catch(() => {});
      }
    } catch (err) {
      console.error('[PDF download]', err);
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

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div id="letter-print-area" />

      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* ── LEFT: Form ──────────────────────────────────────────────── */}
        <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
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
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Offer Date *</label>
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
                onClick={doDownloadPDF}
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Preview area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#e8e8e8' }}>
            {previewEmp ? (
              <div
                id="letter-screen-preview"
                style={{ background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', borderRadius: 4, padding: '24px 28px', maxWidth: 760, margin: '0 auto' }}
              >
                <LetterDoc emp={previewEmp} form={form} />
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
