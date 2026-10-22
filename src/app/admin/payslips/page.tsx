'use client';

import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, Employee, PaySlip } from '@/lib/adminApi';
import { numberToWordsINR } from '@/lib/numberToWords';
import { COMPANY_NAME } from '@/lib/hrConstants';
import { downloadElementAsA4Pdf, PDF_RENDER_WIDTH_PX, safeFileSegment } from '@/lib/payslipPdf';

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthLabel(ym: string) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

function slipTotals(f: SlipForm) {
  const gross    = f.basicSalary + f.hra + f.specialAllowance + f.bonus;
  const totalDed = f.pfDeduction + f.professionalTax + f.otherDeductions;
  return { gross, totalDed, net: gross - totalDed };
}

/** id of the off-screen A4 node rendered only while a PDF is being generated. */
const PDF_SOURCE_ID = 'payslip-pdf-source';

// ── Print styles ──────────────────────────────────────────────────────────────
const PRINT_CSS = `
@media print {
  body > *:not(#payslip-print-area) { display: none !important; }
  #payslip-print-area { display: block !important; position: fixed; inset: 0; background: #fff; z-index: 99999; padding: 0; }
  @page { size: A4; margin: 12mm 14mm; }
}
@media screen { #payslip-print-area { display: none; } }
`;

// ── Payslip document component ────────────────────────────────────────────────
interface PayslipDocProps {
  emp: Employee;
  form: SlipForm;
  gross: number;
  totalDed: number;
  net: number;
  printDate: string;
  /** 'pdf' = fixed-width A4 export layout; the on-screen preview uses 'screen'. */
  variant?: 'screen' | 'pdf';
}

function PayslipDoc({ emp, form, gross, totalDed, net, printDate, variant = 'screen' }: PayslipDocProps) {
  const isPdf = variant === 'pdf';
  const tblBorder = '1px solid #444';
  const thStyle: React.CSSProperties = { padding: '6px 10px', background: '#1a1a2e', color: '#fff', fontWeight: 600, fontSize: 11, textAlign: 'left', border: tblBorder };
  const tdStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 11, border: tblBorder, color: '#111' };
  const tdAmt: React.CSSProperties  = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  // Employee-info cells: on screen keep every label and value on a single line
  // (no mid-word breaks). The PDF page has a fixed A4 width, so there long
  // values wrap inside their column instead of running off the page.
  const infoLabel: React.CSSProperties = isPdf
    ? { padding: '4px 6px', color: '#555', verticalAlign: 'top' }
    : { padding: '4px 6px', color: '#555', whiteSpace: 'nowrap' };
  const infoValue: React.CSSProperties = isPdf
    ? { padding: '4px 6px', fontWeight: 500, verticalAlign: 'top', overflowWrap: 'anywhere' }
    : { padding: '4px 6px', fontWeight: 500, whiteSpace: 'nowrap' };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#fff', color: '#111', fontSize: 12, width: '100%', maxWidth: isPdf ? 'none' : 750, margin: '0 auto' }}>
      {/* Letterhead — logo pinned left, company name + address centered across the full width */}
      <div style={{ position: 'relative', borderBottom: '3px solid #1a1a2e', paddingBottom: 10, marginBottom: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo3.png" alt="Step To Soft" height={44} style={{ objectFit: 'contain', position: 'absolute', left: 0, top: 0 }} />
        <div style={{ textAlign: 'center', minHeight: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', letterSpacing: '0.02em' }}>{COMPANY_NAME}</div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>Web Module-21, Asansol Webel IT Park, Asansol – 713305, WB</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Salary Slip for {monthLabel(form.month)}
        </div>
      </div>

      {/* Employee info grid */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 11, tableLayout: isPdf ? 'fixed' : undefined }}>
        <colgroup>
          <col style={{ width: '14%' }} />
          <col style={{ width: '19%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={infoLabel}>Date</td>
            <td style={infoValue}>: {printDate}</td>
            <td style={infoLabel}>PF Account No.</td>
            <td style={infoValue}>: {emp.pfNumber || '—'}</td>
            <td style={infoLabel}>Bank Name</td>
            <td style={infoValue}>: {emp.bankName || '—'}</td>
          </tr>
          <tr>
            <td style={infoLabel}>Employee Name</td>
            <td style={infoValue}>: {emp.name}</td>
            <td style={infoLabel}>Employee Number</td>
            <td style={infoValue}>: {emp.employeeId || '—'}</td>
            <td style={infoLabel}>Location</td>
            <td style={infoValue}>: {emp.workLocation || '—'}</td>
          </tr>
          <tr>
            <td style={infoLabel}>PAN No</td>
            <td style={infoValue}>: {emp.panNumber || '—'}</td>
            <td style={infoLabel}>UAN Number</td>
            <td style={infoValue}>: {emp.uanNumber || '—'}</td>
            <td style={infoLabel}>Branch Name</td>
            <td style={infoValue}>: {emp.branchName || '—'}</td>
          </tr>
          <tr>
            <td style={infoLabel}>Designation</td>
            <td style={infoValue}>: {emp.designation}</td>
            <td style={infoLabel}>Account No</td>
            <td style={infoValue}>: {emp.accountNumber || '—'}</td>
            <td style={infoLabel}>Branch Code</td>
            <td style={infoValue}>: {emp.branchCode || '—'}</td>
          </tr>
          <tr>
            <td style={infoLabel}>Worked Days</td>
            <td style={infoValue}>: {form.workingDays}</td>
            <td style={infoLabel}>IFSC Code</td>
            <td style={infoValue}>: {emp.ifscCode || '—'}</td>
            <td></td><td></td>
          </tr>
        </tbody>
      </table>

      {/* Earnings / Deductions table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
        <thead>
          <tr>
            <th style={thStyle}>Earnings</th>
            <th style={{ ...thStyle, textAlign: 'right', width: '22%' }}>Amount (₹)</th>
            <th style={thStyle}>Deductions</th>
            <th style={{ ...thStyle, textAlign: 'right', width: '22%' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Basic Salary</td>
            <td style={tdAmt}>{fmtINR(form.basicSalary)}</td>
            <td style={tdStyle}>Provident Fund (EPF)</td>
            <td style={tdAmt}>{fmtINR(form.pfDeduction)}</td>
          </tr>
          <tr>
            <td style={tdStyle}>House Rent Allowance</td>
            <td style={tdAmt}>{fmtINR(form.hra)}</td>
            <td style={tdStyle}>Professional Tax</td>
            <td style={tdAmt}>{fmtINR(form.professionalTax)}</td>
          </tr>
          <tr>
            <td style={tdStyle}>Special Allowance</td>
            <td style={tdAmt}>{fmtINR(form.specialAllowance)}</td>
            <td style={tdStyle}>{form.otherDeductions > 0 ? 'Other Deductions' : ''}</td>
            <td style={tdAmt}>{form.otherDeductions > 0 ? fmtINR(form.otherDeductions) : ''}</td>
          </tr>
          {form.bonus > 0 && (
            <tr>
              <td style={tdStyle}>Bonus</td>
              <td style={tdAmt}>{fmtINR(form.bonus)}</td>
              <td style={tdStyle}></td><td style={tdAmt}></td>
            </tr>
          )}
          <tr style={{ background: '#f5f5f5' }}>
            <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>Total Earnings</td>
            <td style={{ ...tdAmt, fontWeight: 700 }}>{fmtINR(gross)}</td>
            <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>Total Deductions</td>
            <td style={{ ...tdAmt, fontWeight: 700 }}>{fmtINR(totalDed)}</td>
          </tr>
          <tr style={{ background: '#eef2ff' }}>
            <td style={tdStyle}></td>
            <td style={tdAmt}></td>
            <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right', color: '#1a1a2e' }}>Net Amount</td>
            <td style={{ ...tdAmt, fontWeight: 700, color: '#1a1a2e', fontSize: 13 }}>{fmtINR(net)}</td>
          </tr>
        </tbody>
      </table>

      {/* Amount in words */}
      <div style={{ marginBottom: 20, fontSize: 12 }}>
        <strong>Amount (in words):</strong>
        <div style={{ marginTop: 4, color: '#333' }}>{numberToWordsINR(net)}</div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', color: '#777', fontSize: 10, borderTop: '1px solid #ccc', paddingTop: 8, marginTop: 8 }}>
        This is a Computer Generated Pay Slip — No signature required
      </div>
    </div>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────
interface SlipForm {
  employeeId: string;
  month: string;
  workingDays: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  pfDeduction: number;
  professionalTax: number;
  otherDeductions: number;
}

const BLANK_FORM: SlipForm = {
  employeeId: '', month: '', workingDays: 26,
  basicSalary: 0, hra: 0, specialAllowance: 0, bonus: 0,
  pfDeduction: 1800, professionalTax: 200, otherDeductions: 0,
};

function slipToForm(slip: PaySlip, emp: Employee): SlipForm {
  return {
    employeeId:      emp._id,
    month:           slip.month,
    workingDays:     slip.workingDays,
    basicSalary:     slip.basicSalary,
    hra:             slip.hra,
    specialAllowance:slip.specialAllowance,
    bonus:           slip.bonus,
    pfDeduction:     slip.pfDeduction,
    professionalTax: slip.professionalTax,
    otherDeductions: slip.otherDeductions,
  };
}

/** One PDF export: exactly the employee + figures to render, independent of the edit form. */
interface PdfJob {
  emp: Employee;
  form: SlipForm;
  /** Payslip record to mark as downloaded afterwards, if any. */
  slipId: string | null;
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
export default function PayslipsPage() {
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [slips, setSlips]           = useState<PaySlip[]>([]);
  const [slipTotal, setSlipTotal]   = useState(0);
  const [slipPage, setSlipPage]     = useState(1);
  const [slipPages, setSlipPages]   = useState(1);
  const [loading, setLoading]       = useState(false);
  const [form, setForm]             = useState<SlipForm>(BLANK_FORM);
  const [saving, setSaving]         = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');
  const [saveErr, setSaveErr]       = useState('');
  const [previewEmp, setPreviewEmp] = useState<Employee | null>(null);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [pdfJob, setPdfJob]         = useState<PdfJob | null>(null);
  const runningJob                  = useRef<PdfJob | null>(null);

  const { gross, totalDed, net } = slipTotals(form);

  const today = new Date();
  const printDate = `${String(today.getDate()).padStart(2,'0')}-${String(today.getMonth()+1).padStart(2,'0')}-${today.getFullYear()}`;

  const loadEmps = useCallback(async () => {
    try {
      const r = await adminApi.employees({ limit: '100' });
      setEmployees(r.data);
    } catch { /* silent */ }
  }, []);

  const loadSlips = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.payslips({ page: String(slipPage), limit: '15' });
      setSlips(r.data); setSlipTotal(r.meta.total); setSlipPages(r.meta.pages);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [slipPage]);

  useEffect(() => { loadEmps(); }, [loadEmps]);
  useEffect(() => { loadSlips(); }, [loadSlips]);

  // Generate the PDF once the off-screen A4 node for the requested job is in the DOM.
  useEffect(() => {
    if (!pdfJob || runningJob.current === pdfJob) return;
    runningJob.current = pdfJob;
    (async () => {
      try {
        const el = document.getElementById(PDF_SOURCE_ID);
        if (!el) throw new Error('PDF render node missing');
        const empCode = pdfJob.emp.employeeId || pdfJob.emp._id.slice(-6);
        await downloadElementAsA4Pdf(el, {
          sourceId: PDF_SOURCE_ID,
          fileName: `STS-Payslip-${safeFileSegment(empCode)}-${safeFileSegment(pdfJob.form.month)}.pdf`,
          title: `Salary Slip - ${pdfJob.emp.name} - ${monthLabel(pdfJob.form.month)}`,
          author: COMPANY_NAME,
        });
        // Mark as downloaded
        if (pdfJob.slipId) {
          adminApi.updatePayslip(pdfJob.slipId, { status: 'downloaded' } as Partial<PaySlip>).catch(() => {});
        }
      } catch (err) {
        console.error('[PDF download]', err);
        setSaveErr('Could not generate the PDF. Please try again.');
      } finally {
        runningJob.current = null;
        setPdfJob(null);
        setDownloading(false);
      }
    })();
  }, [pdfJob]);

  function set(k: keyof SlipForm, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  function handleEmpChange(id: string) {
    set('employeeId', id);
    const emp = employees.find(e => e._id === id);
    if (emp) {
      setPreviewEmp(emp);
      set('basicSalary', emp.basicSalary);
      set('hra', emp.hra);
      set('specialAllowance', emp.specialAllowance);
      set('pfDeduction', Math.min(1800, Math.round(emp.basicSalary * 0.12)));
    }
  }

  function slipEmployee(slip: PaySlip): Employee | null {
    return typeof slip.employeeId === 'object'
      ? (slip.employeeId as Employee)
      : employees.find(e => e._id === slip.employeeId) ?? null;
  }

  function loadSlipIntoForm(slip: PaySlip) {
    const emp = slipEmployee(slip);
    if (!emp) return;
    setPreviewEmp(emp);
    setForm(slipToForm(slip, emp));
  }

  function handleEdit(slip: PaySlip) {
    loadSlipIntoForm(slip);
    setEditingId(slip._id);
    setSaveMsg(''); setSaveErr('');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(BLANK_FORM);
    setPreviewEmp(null);
    setSaveMsg(''); setSaveErr('');
  }

  function requestPdf(job: PdfJob) {
    if (pdfJob || downloading) return;
    setSaveErr('');
    setDownloading(true);
    setPdfJob(job);
  }

  async function handleHistoryDownload(slip: PaySlip) {
    if (pdfJob || downloading) return;
    setSaveErr('');
    setDownloading(true);
    try {
      // The history list embeds only name/ID/designation of the employee; load
      // the full record so PAN, PF, UAN and bank details appear on the PDF.
      const { data: full } = await adminApi.payslip(slip._id);
      const emp = full.employeeId && typeof full.employeeId === 'object' ? (full.employeeId as Employee) : null;
      if (!emp) throw new Error('The employee for this payslip could not be found.');
      const slipForm = slipToForm(full, emp);
      // Show the slip in the preview as before — unless another slip is being
      // edited, whose unsaved changes must not be overwritten.
      if (!editingId) { setPreviewEmp(emp); setForm(slipForm); }
      setPdfJob({ emp, form: slipForm, slipId: editingId === slip._id ? slip._id : null });
    } catch (err) {
      setDownloading(false);
      setSaveErr(err instanceof Error ? err.message : 'Could not load this payslip.');
    }
  }

  function handleDownloadPDF() {
    if (!previewEmp || !form.month) return;
    requestPdf({ emp: previewEmp, form: { ...form }, slipId: editingId });
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaveMsg(''); setSaveErr('');
    if (!form.employeeId) { setSaveErr('Select an employee'); return; }
    if (!form.month)      { setSaveErr('Select month/year'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updatePayslip(editingId, { ...form });
        setSaveMsg('Payslip updated successfully!');
        setEditingId(null);
      } else {
        await adminApi.createPayslip({ ...form });
        setSaveMsg('Payslip saved successfully!');
        setForm(BLANK_FORM);
        setPreviewEmp(null);
      }
      loadSlips();
    } catch (err: unknown) { setSaveErr(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  function handlePrint() {
    if (!previewEmp || !form.month) return;
    const el = document.getElementById('payslip-screen-preview');
    if (!el) return;
    const printArea = document.getElementById('payslip-print-area');
    if (!printArea) return;
    printArea.innerHTML = el.innerHTML;
    window.print();
  }

  async function handleDeleteSlip(id: string) {
    if (!confirm('Delete this payslip record?')) return;
    try {
      await adminApi.deletePayslip(id);
      if (editingId === id) handleCancelEdit();
      loadSlips();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  }

  const canPreview = Boolean(previewEmp && form.month);

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div id="payslip-print-area" />

      {/* Off-screen, fixed-width A4 layout used only for PDF export. Portalled to
          <body> so no admin-layout overflow, transform or responsive table rule
          can affect it; see lib/payslipPdf.ts. */}
      {pdfJob && createPortal(
        <div
          id={PDF_SOURCE_ID}
          aria-hidden="true"
          style={{ position: 'fixed', left: -10000, top: 0, width: PDF_RENDER_WIDTH_PX, background: '#fff', pointerEvents: 'none' }}
        >
          <PayslipDoc variant="pdf" emp={pdfJob.emp} form={pdfJob.form} {...slipTotals(pdfJob.form)} printDate={printDate} />
        </div>,
        document.body
      )}

      <div className="admin-split" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* ── LEFT: Form ─────────────────────────────────────────────── */}
        <div className="admin-split-side" style={{ width: 340, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {editingId ? 'Edit Payslip' : 'Generate Payslip'}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Month &amp; Year *</label>
              <input type="month" style={inp} value={form.month} onChange={e => set('month', e.target.value)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Working Days</label>
              <input type="number" style={inp} min={0} max={31} value={form.workingDays} onChange={e => set('workingDays', Number(e.target.value))} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Earnings</div>

            {([['basicSalary','Basic Salary (₹)'],['hra','HRA (₹)'],['specialAllowance','Special Allowance (₹)'],['bonus','Bonus (₹)']] as const).map(([k, lbl]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>{lbl}</label>
                <input type="number" style={inp} min={0} value={form[k]} onChange={e => set(k, Number(e.target.value))} />
              </div>
            ))}

            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--fg-3)' }}>Gross Total</span>
              <span style={{ fontWeight: 600 }}>₹{fmtINR(gross)}</span>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deductions</div>

            {([['pfDeduction','PF Deduction (₹)'],['professionalTax','Professional Tax (₹)'],['otherDeductions','Other Deductions (₹)']] as const).map(([k, lbl]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>{lbl}</label>
                <input type="number" style={inp} min={0} value={form[k]} onChange={e => set(k, Number(e.target.value))} />
              </div>
            ))}

            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r-sm)', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--fg-2)', fontWeight: 500 }}>Net Salary</span>
              <span style={{ fontWeight: 700, color: '#4ade80' }}>₹{fmtINR(net)}</span>
            </div>

            {saveErr && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#f87171' }}>{saveErr}</div>}
            {saveMsg && <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#4ade80' }}>{saveMsg}</div>}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : editingId ? 'Update Payslip' : 'Save Payslip'}
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

        {/* ── RIGHT: Preview + History ──────────────────────────────── */}
        <div className="admin-split-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Document preview */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#e8e8e8' }}>
            <div style={{ background: '#fff', borderRadius: 4, padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', minHeight: 500 }} id="payslip-screen-preview">
              {previewEmp && form.month ? (
                <PayslipDoc emp={previewEmp} form={form} gross={gross} totalDed={totalDed} net={net} printDate={printDate} />
              ) : (
                <div style={{ color: '#999', fontSize: 13, textAlign: 'center', paddingTop: 80 }}>
                  Select an employee and month to preview the payslip
                </div>
              )}
            </div>
          </div>

          {/* History table */}
          <div style={{ borderTop: '1px solid var(--line)', flexShrink: 0, maxHeight: 260, overflowY: 'auto' }}>
            <div style={{ padding: '10px 16px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Payslip History <span style={{ color: 'var(--fg-4)', fontWeight: 400, fontSize: 12 }}>({slipTotal})</span></span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={slipPage <= 1} onClick={() => setSlipPage(p => p - 1)} style={{ ...btnSec, padding: '3px 10px', fontSize: 11 }}>Prev</button>
                <span style={{ fontSize: 12, color: 'var(--fg-3)', alignSelf: 'center' }}>{slipPage}/{slipPages}</span>
                <button disabled={slipPage >= slipPages} onClick={() => setSlipPage(p => p + 1)} style={{ ...btnSec, padding: '3px 10px', fontSize: 11 }}>Next</button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-4)', fontSize: 12 }}>Loading…</div>
            ) : slips.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-4)', fontSize: 12 }}>No payslips generated yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-1)' }}>
                    {['Employee', 'Month', 'Net Salary', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slips.map(s => {
                    const emp = typeof s.employeeId === 'object' ? (s.employeeId as Employee) : null;
                    const isEditing = editingId === s._id;
                    return (
                      <tr key={s._id} style={{ borderBottom: '1px solid var(--line)', background: isEditing ? 'rgba(45,54,217,0.06)' : 'transparent' }}>
                        <td style={{ padding: '7px 12px', fontSize: 12 }}>{emp?.name ?? '—'}</td>
                        <td style={{ padding: '7px 12px', fontSize: 12, color: 'var(--fg-3)' }}>{monthLabel(s.month)}</td>
                        <td style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600 }}>₹{fmtINR(s.netSalary)}</td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                            background: s.status === 'downloaded' ? '#dcfce7' : s.status === 'sent' ? '#dbeafe' : '#fef9c3',
                            color:      s.status === 'downloaded' ? '#166534' : s.status === 'sent' ? '#1e40af' : '#854d0e',
                          }}>{s.status}</span>
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                              onClick={() => handleEdit(s)}
                              style={{ ...btnSec, padding: '3px 8px', fontSize: 11, color: isEditing ? 'var(--accent)' : undefined }}
                            >
                              {isEditing ? 'Editing…' : 'Edit'}
                            </button>
                            <button
                              onClick={() => handleHistoryDownload(s)}
                              style={{ padding: '3px 8px', fontSize: 11, color: '#16a34a', background: 'transparent', border: '1px solid #86efac', borderRadius: 4, cursor: 'pointer' }}
                            >
                              PDF
                            </button>
                            <button onClick={() => handleDeleteSlip(s._id)} style={btnDanger}>Del</button>
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
