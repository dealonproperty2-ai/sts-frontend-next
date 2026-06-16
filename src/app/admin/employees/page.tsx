'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { adminApi, Employee } from '@/lib/adminApi';

const DEPARTMENTS = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Management', 'QA', 'DevOps'];
const DESIGNATIONS = ['Software Developer', 'Senior Developer', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'UI/UX Designer', 'Project Manager', 'Team Lead', 'HR Manager',
  'Sr Accountant', 'Accountant', 'Business Analyst', 'QA Engineer', 'DevOps Engineer', 'Intern'];

const BLANK: Partial<Employee> = {
  name: '', fatherName: '', email: '', phone: '', address: '',
  designation: '', department: '', joiningDate: '',
  basicSalary: 0, hra: 0, specialAllowance: 0,
  panNumber: '', uanNumber: '', pfNumber: '',
  bankName: '', accountNumber: '', ifscCode: '', branchName: '', branchCode: '',
  workLocation: '', isActive: true,
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const inp: React.CSSProperties = {
  padding: '8px 10px', fontSize: 13, color: 'var(--fg)', background: 'var(--bg-2)',
  border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none',
  width: '100%', boxSizing: 'border-box',
};
const label14: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 4, display: 'block' };
const btnPrimary: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff',
  background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  padding: '8px 14px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)',
  background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={label14}>{label}</label>
      {children}
    </div>
  );
}

export default function EmployeesPage() {
  const [items, setItems]   = useState<Employee[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [pages, setPages]   = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const [modal, setModal]   = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm]     = useState<Partial<Employee>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      const res = await adminApi.employees(params);
      setItems(res.data); setTotal(res.meta.total); setPages(res.meta.pages);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(BLANK); setFormError(''); setEditTarget(null); setModal('create'); }
  function openEdit(emp: Employee) {
    setForm({
      ...emp,
      joiningDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : '',
    });
    setFormError(''); setEditTarget(emp); setModal('edit');
  }
  function set(k: keyof Employee, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setFormError('');
    if (!form.name?.trim()) { setFormError('Name is required'); return; }
    if (!form.designation?.trim()) { setFormError('Designation is required'); return; }
    setSaving(true);
    try {
      if (modal === 'create') await adminApi.createEmployee(form);
      else if (editTarget) await adminApi.updateEmployee(editTarget._id, form);
      setModal(null); load();
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try { await adminApi.deleteEmployee(id); setDeleteConfirm(null); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Delete failed'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, flex: 1 }}>
          Employees <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-4)' }}>({total})</span>
        </h1>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, ID, designation…"
          style={{ ...inp, width: 220, padding: '7px 10px' }}
        />
        <button onClick={() => load()} style={btnSecondary}>Refresh</button>
        <button onClick={openCreate} style={btnPrimary}>+ Add Employee</button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>No employees found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-1)' }}>
                {['Emp ID', 'Name', 'Designation', 'Department', 'Phone', 'Joining', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(emp => (
                <tr key={emp._id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', color: 'var(--fg-3)' }}>{emp.employeeId || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{emp.name}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--fg-2)' }}>{emp.designation}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--fg-3)' }}>{emp.department || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--fg-3)' }}>{emp.phone || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{fmtDate(emp.joiningDate)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: emp.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: emp.isActive ? '#4ade80' : '#f87171' }}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(emp)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }}>Edit</button>
                      <button onClick={() => setDeleteConfirm(emp._id)} style={{ padding: '4px 10px', fontSize: 12, fontWeight: 500, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ ...btnSecondary, padding: '5px 12px', fontSize: 12 }}>Prev</button>
          <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={{ ...btnSecondary, padding: '5px 12px', fontSize: 12 }}>Next</button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', width: '100%', maxWidth: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{modal === 'create' ? 'Add Employee' : 'Edit Employee'}</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Personal Info */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Personal Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Employee Number">
                    <input style={inp} value={form.employeeId ?? ''} onChange={e => set('employeeId', e.target.value)} placeholder="e.g. STS0000001" />
                    <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>Leave blank to auto-generate.</div>
                  </Field>
                  <Field label="Full Name *"><input style={inp} value={form.name ?? ''} onChange={e => set('name', e.target.value)} required placeholder="Md Hussain Azad" /></Field>
                  <Field label="Father's Name"><input style={inp} value={form.fatherName ?? ''} onChange={e => set('fatherName', e.target.value)} placeholder="Md Azad" /></Field>
                  <Field label="Email"><input type="email" style={inp} value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="employee@example.com" /></Field>
                  <Field label="Phone"><input style={inp} value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" /></Field>
                  <Field label="Address" ><textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }} value={form.address ?? ''} onChange={e => set('address', e.target.value)} placeholder="Full address" /></Field>
                  <Field label="Work Location"><input style={inp} value={form.workLocation ?? ''} onChange={e => set('workLocation', e.target.value)} placeholder="Asansol Webel IT Park" /></Field>
                </div>
              </div>

              {/* Job Info */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Job Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Designation *">
                    <input style={inp} list="designations-list" value={form.designation ?? ''} onChange={e => set('designation', e.target.value)} required placeholder="Software Developer" />
                    <datalist id="designations-list">{DESIGNATIONS.map(d => <option key={d} value={d} />)}</datalist>
                  </Field>
                  <Field label="Department">
                    <input style={inp} list="dept-list" value={form.department ?? ''} onChange={e => set('department', e.target.value)} placeholder="Engineering" />
                    <datalist id="dept-list">{DEPARTMENTS.map(d => <option key={d} value={d} />)}</datalist>
                  </Field>
                  <Field label="Joining Date"><input type="date" style={inp} value={form.joiningDate ?? ''} onChange={e => set('joiningDate', e.target.value)} /></Field>
                  <Field label="Status">
                    <select style={inp} value={String(form.isActive ?? true)} onChange={e => set('isActive', e.target.value === 'true')}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* Salary */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Salary Structure</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Field label="Basic Salary (₹)"><input type="number" style={inp} min={0} value={form.basicSalary ?? 0} onChange={e => set('basicSalary', Number(e.target.value))} /></Field>
                  <Field label="HRA (₹)"><input type="number" style={inp} min={0} value={form.hra ?? 0} onChange={e => set('hra', Number(e.target.value))} /></Field>
                  <Field label="Special Allowance (₹)"><input type="number" style={inp} min={0} value={form.specialAllowance ?? 0} onChange={e => set('specialAllowance', Number(e.target.value))} /></Field>
                </div>
              </div>

              {/* Tax & Statutory */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Statutory Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Field label="PAN Number"><input style={inp} value={form.panNumber ?? ''} onChange={e => set('panNumber', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} /></Field>
                  <Field label="UAN Number"><input style={inp} value={form.uanNumber ?? ''} onChange={e => set('uanNumber', e.target.value)} placeholder="100XXXXXXXXX" /></Field>
                  <Field label="PF Account Number"><input style={inp} value={form.pfNumber ?? ''} onChange={e => set('pfNumber', e.target.value)} placeholder="WBDGP25227930…" /></Field>
                </div>
              </div>

              {/* Bank */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bank Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Bank Name"><input style={inp} value={form.bankName ?? ''} onChange={e => set('bankName', e.target.value)} placeholder="HDFC Bank" /></Field>
                  <Field label="Account Number"><input style={inp} value={form.accountNumber ?? ''} onChange={e => set('accountNumber', e.target.value)} placeholder="50100851793981" /></Field>
                  <Field label="IFSC Code"><input style={inp} value={form.ifscCode ?? ''} onChange={e => set('ifscCode', e.target.value.toUpperCase())} placeholder="HDFC0005663" /></Field>
                  <Field label="Branch Name"><input style={inp} value={form.branchName ?? ''} onChange={e => set('branchName', e.target.value)} placeholder="Hutton Road" /></Field>
                  <Field label="Branch Code"><input style={inp} value={form.branchCode ?? ''} onChange={e => set('branchCode', e.target.value)} placeholder="0005663" /></Field>
                </div>
              </div>

              {formError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#f87171' }}>{formError}</div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, flexShrink: 0 }}>
                <button type="button" onClick={() => setModal(null)} style={btnSecondary}>Cancel</button>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : modal === 'create' ? 'Add Employee' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 28, maxWidth: 360, width: '100%' }}>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--fg-2)' }}>Remove this employee? Their payslips and documents will be preserved.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={btnSecondary}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ ...btnPrimary, background: '#ef4444' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
