'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { adminApi, Employee, PaySlip } from '@/lib/adminApi';
import { numberToWordsINR } from '@/lib/numberToWords';
import { COMPANY_NAME, LOGO_BASE64 } from '@/lib/hrConstants';

// ── Helpers ──────────────────────────────────────────────────────────────────

function monthLabel(ym: string) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

// ── Print styles injected once ────────────────────────────────────────────────
const PRINT_CSS = `
@media print {
  body > *:not(#payslip-print-area) { display: none !important; }
  #payslip-print-area { display: block !important; position: fixed; inset: 0; background: #fff; z-index: 99999; padding: 0; }
  @page { size: A4; margin: 12mm 14mm; }
}
@media screen { #payslip-print-area { display: none; } }
`;

// ── Payslip document component (used for both preview and print) ──────────────
interface PayslipDocProps {
  emp: Employee;
  form: SlipForm;
  gross: number;
  totalDed: number;
  net: number;
  printDate: string;
}

function PayslipDoc({ emp, form, gross, totalDed, net, printDate }: PayslipDocProps) {
  const tblBorder = '1px solid #444';
  const thStyle: React.CSSProperties = { padding: '6px 10px', background: '#1a1a2e', color: '#fff', fontWeight: 600, fontSize: 11, textAlign: 'left', border: tblBorder };
  const tdStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 11, border: tblBorder, color: '#111' };
  const tdAmt: React.CSSProperties  = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#fff', color: '#111', fontSize: 12, width: '100%', maxWidth: 750, margin: '0 auto' }}>
      {/* Letterhead */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #1a1a2e', paddingBottom: 10, marginBottom: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_BASE64} alt="Step To Soft" height={44} style={{ objectFit: 'contain' }} />
        <div style={{ textAlign: 'right' }}>
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
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 11 }}>
        <tbody>
          <tr>
            <td style={{ padding: '4px 6px', color: '#555', width: '16%' }}>Date</td>
            <td style={{ padding: '4px 6px', fontWeight: 500, width: '17%' }}>: {printDate}</td>
            <td style={{ padding: '4px 6px', color: '#555', width: '20%' }}>PF Account No.</td>
            <td style={{ padding: '4px 6px', fontWeight: 500, width: '23%' }}>: {emp.pfNumber || '—'}</td>
            <td style={{ padding: '4px 6px', color: '#555', width: '10%' }}>Bank Name</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {emp.bankName || '—'}</td>
          </tr>
          <tr>
            <td style={{ padding: '4px 6px', color: '#555' }}>Employee Name</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {emp.name}</td>
            <td style={{ padding: '4px 6px', color: '#555' }}>Employee Number</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {emp.employeeId || '—'}</td>
            <td style={{ padding: '4px 6px', color: '#555' }}>Location</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {emp.workLocation || '—'}</td>
          </tr>
          <tr>
            <td style={{ padding: '4px 6px', color: '#555' }}>PAN No</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {emp.panNumber || '—'}</td>
            <td style={{ padding: '4px 6px', color: '#555' }}>UAN Number</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {emp.uanNumber || '—'}</td>
            <td style={{ padding: '4px 6px', color: '#555' }}>Branch Name</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {emp.branchName || '—'}</td>
          </tr>
          <tr>
            <td style={{ padding: '4px 6px', color: '#555' }}>Designation</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {emp.designation}</td>
            <td style={{ padding: '4px 6px', color: '#555' }}>Account No</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {emp.accountNumber || '—'}</td>
            <td style={{ padding: '4px 6px', color: '#555' }}>Branch Code</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {emp.branchCode || '—'}</td>
          </tr>
          <tr>
            <td style={{ padding: '4px 6px', color: '#555' }}>Worked Days</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {form.workingDays}</td>
            <td style={{ padding: '4px 6px', color: '#555' }}>IFSC Code</td>
            <td style={{ padding: '4px 6px', fontWeight: 500 }}>: {emp.ifscCode || '—'}</td>
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
          {/* Totals row */}
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

// ── Styles ────────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, color: 'var(--fg)', background: 'var(--bg-2)',
  border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none',
  width: '100%', boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff',
  background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnSec: React.CSSProperties = {
  padding: '8px 14px', fontSize: 13, color: 'var(--fg-2)', background: 'var(--bg-2)',
  border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PayslipsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [slips, setSlips]         = useState<PaySlip[]>([]);
  const [slipTotal, setSlipTotal] = useState(0);
  const [slipPage, setSlipPage]   = useState(1);
  const [slipPages, setSlipPages] = useState(1);
  const [loading, setLoading]     = useState(false);
  const [form, setForm]           = useState<SlipForm>(BLANK_FORM);
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');
  const [saveErr, setSaveErr]     = useState('');
  const [previewEmp, setPreviewEmp] = useState<Employee | null>(null);

  const gross    = form.basicSalary + form.hra + form.specialAllowance + form.bonus;
  const totalDed = form.pfDeduction + form.professionalTax + form.otherDeductions;
  const net      = gross - totalDed;

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
      const params: Record<string, string> = { page: String(slipPage), limit: '15' };
      const r = await adminApi.payslips(params);
      setSlips(r.data); setSlipTotal(r.meta.total);
      setSlipPages(r.meta.pages);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [slipPage]);

  useEffect(() => { loadEmps(); }, [loadEmps]);
  useEffect(() => { loadSlips(); }, [loadSlips]);

  function set(k: keyof SlipForm, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  function handleEmpChange(id: string) {
    set('employeeId', id);
    const emp = employees.find(e => e._id === id);
    if (emp) {
      setPreviewEmp(emp);
      set('basicSalary', emp.basicSalary);
      set('hra', emp.hra);
      set('specialAllowance', emp.specialAllowance);
      // Auto-compute PF as 12% of basic, capped at 1800
      set('pfDeduction', Math.min(1800, Math.round(emp.basicSalary * 0.12)));
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaveMsg(''); setSaveErr('');
    if (!form.employeeId) { setSaveErr('Select an employee'); return; }
    if (!form.month)      { setSaveErr('Select month/year'); return; }
    setSaving(true);
    try {
      await adminApi.createPayslip({ ...form });
      setSaveMsg('Payslip saved successfully!');
      loadSlips();
    } catch (err: unknown) { setSaveErr(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  function handlePrint() {
    if (!previewEmp || !form.month) return;
    // Build print-area HTML and trigger print
    const el = document.getElementById('payslip-screen-preview');
    if (!el) return;
    const printArea = document.getElementById('payslip-print-area');
    if (!printArea) return;
    printArea.innerHTML = el.innerHTML;
    window.print();
  }

  async function handleDeleteSlip(id: string) {
    if (!confirm('Delete this payslip record?')) return;
    try { await adminApi.deletePayslip(id); loadSlips(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  }

  return (
    <>
      <style>{PRINT_CSS}</style>
      {/* Hidden print area - cloned from preview on print click */}
      <div id="payslip-print-area" />

      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* ── LEFT: Form ─────────────────────────────────────────────── */}
        <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', fontSize: 14, fontWeight: 600 }}>Generate Payslip</div>
          <form onSubmit={handleSave} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Employee *</label>
              <select style={inp} value={form.employeeId} onChange={e => handleEmpChange(e.target.value)}>
                <option value="">— Select Employee —</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.employeeId || e._id.slice(-6)})</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)' }}>Month & Year *</label>
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

            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r-sm)', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--fg-2)', fontWeight: 500 }}>Net Salary</span>
              <span style={{ fontWeight: 700, color: '#4ade80' }}>₹{fmtINR(net)}</span>
            </div>

            {saveErr && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#f87171' }}>{saveErr}</div>}
            {saveMsg && <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#4ade80' }}>{saveMsg}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : '💾 Save Payslip'}
              </button>
              <button type="button" onClick={handlePrint} disabled={!previewEmp || !form.month} style={{ ...btnSec, opacity: (!previewEmp || !form.month) ? 0.4 : 1 }}>
                🖨 Print
              </button>
            </div>
          </form>
        </div>

        {/* ── RIGHT: Preview + History ──────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                    {['Employee', 'Month', 'Net Salary', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slips.map(s => {
                    const emp = typeof s.employeeId === 'object' ? (s.employeeId as Employee) : null;
                    return (
                      <tr key={s._id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '7px 12px', fontSize: 12 }}>{emp?.name ?? '—'}</td>
                        <td style={{ padding: '7px 12px', fontSize: 12, color: 'var(--fg-3)' }}>{monthLabel(s.month)}</td>
                        <td style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600 }}>₹{fmtINR(s.netSalary)}</td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>{s.status}</span>
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          <button onClick={() => handleDeleteSlip(s._id)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>×</button>
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
