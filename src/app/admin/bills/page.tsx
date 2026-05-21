'use client';

import { useEffect, useState, useCallback, useRef, FormEvent } from 'react';
import { adminApi, Bill, BillStats } from '@/lib/adminApi';

// ─── Constants ───────────────────────────────────────────────────────────────

const BILL_TYPES = [
  { value: 'rent', label: 'Office Rent' },
  { value: 'electricity', label: 'Electricity Bill' },
];

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(THIS_YEAR - i));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtMonth(yyyyMM: string) {
  if (!yyyyMM || !/^\d{4}-\d{2}$/.test(yyyyMM)) return yyyyMM || '—';
  const [y, m] = yyyyMM.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n);
}

function typeLabel(v: string) {
  return BILL_TYPES.find(t => t.value === v)?.label ?? v;
}

function nowYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isOverdue(dueDate: string, status: string) {
  return status === 'pending' && new Date(dueDate) < new Date();
}

function isDueSoon(dueDate: string, status: string) {
  if (status !== 'pending') return false;
  const diff = new Date(dueDate).getTime() - Date.now();
  return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type BillFormData = {
  billType: string;
  billMonth: string;
  invoiceNumber: string;
  billDate: string;
  dueDate: string;
  amount: string;
  gstAmount: string;
  status: string;
  paidDate: string;
  notes: string;
};

const BLANK_FORM: BillFormData = {
  billType: 'rent',
  billMonth: nowYYYYMM(),
  invoiceNumber: '',
  billDate: '',
  dueDate: '',
  amount: '',
  gstAmount: '0',
  status: 'pending',
  paidDate: '',
  notes: '',
};

function billToForm(b: Bill): BillFormData {
  return {
    billType: b.billType,
    billMonth: b.billMonth,
    invoiceNumber: b.invoiceNumber,
    billDate: b.billDate ? b.billDate.slice(0, 10) : '',
    dueDate: b.dueDate ? b.dueDate.slice(0, 10) : '',
    amount: String(b.amount),
    gstAmount: String(b.gstAmount),
    status: b.status,
    paidDate: b.paidDate ? b.paidDate.slice(0, 10) : '',
    notes: b.notes ?? '',
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-md)', padding: '18px 22px',
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.1 }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isRent = type === 'rent';
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      background: isRent ? 'rgba(59,130,246,0.15)' : 'rgba(251,146,60,0.15)',
      color: isRent ? '#60a5fa' : '#fb923c',
    }}>
      {typeLabel(type)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const paid = status === 'paid';
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      background: paid ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
      color: paid ? '#4ade80' : '#fbbf24',
    }}>
      {paid ? 'Paid' : 'Pending'}
    </span>
  );
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>
        {label}{required && <span style={{ color: '#f87171' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

// Fetches a protected file, returns a blob URL (revoked on unmount / url change)
function useSecureBlob(fileUrl: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fileUrl) { setBlobUrl(null); return; }

    let cancelled = false;
    let objectUrl: string | null = null;

    setLoading(true);
    setBlobUrl(null);

    const token =
      typeof window !== 'undefined'
        ? (localStorage.getItem('sts-admin-token') ?? '')
        : '';

    fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('not ok');
        return r.blob();
      })
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setBlobUrl(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl]);

  return { blobUrl, loading };
}

function FilePreview({
  fileUrl, fileType, fileName,
}: { fileUrl: string; fileType: string; fileName: string }) {
  const { blobUrl, loading } = useSecureBlob(fileUrl);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-4)', fontSize: 13 }}>
        Loading document…
      </div>
    );
  }
  if (!blobUrl) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-4)', fontSize: 13 }}>
        Preview unavailable
      </div>
    );
  }
  if (fileType === 'application/pdf') {
    return (
      <iframe
        src={blobUrl}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title={fileName}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={blobUrl}
      alt={fileName}
      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BillsPage() {
  // List state
  const [items, setItems] = useState<Bill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stats
  const [stats, setStats] = useState<BillStats | null>(null);

  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Bill | null>(null);
  const [form, setForm] = useState<BillFormData>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // File upload
  const [uploadedFile, setUploadedFile] = useState<{
    fileUrl: string; fileName: string; fileType: string; fileSize: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview modal
  const [previewBill, setPreviewBill] = useState<Bill | null>(null);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Export / reminders
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {
        page: String(page), limit: '20',
      };
      if (filterMonth) params.month = filterMonth;
      else if (filterYear) params.year = filterYear;
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;

      const [listRes, statsRes] = await Promise.all([
        adminApi.bills(params),
        adminApi.billStats(),
      ]);

      setItems(listRes.data);
      setTotal(listRes.meta.total);
      setPages(listRes.meta.pages);
      setStats(statsRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, filterMonth, filterYear, filterType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  // ── Export / Reminders ──────────────────────────────────────────────────────

  function handleExport() {
    const params: Record<string, string> = {};
    if (filterMonth) params.month = filterMonth;
    else if (filterYear) params.year = filterYear;
    if (filterType) params.type = filterType;
    if (filterStatus) params.status = filterStatus;
    adminApi.exportBills(params);
  }

  async function handleSendReminders() {
    setReminderLoading(true);
    setReminderMsg('');
    try {
      const r = await adminApi.sendBillReminders();
      const n = r.sent ?? 0;
      setReminderMsg(n === 0 ? 'No upcoming dues in 7 days.' : `Reminder sent for ${n} bill(s).`);
    } catch (err: unknown) {
      setReminderMsg(err instanceof Error ? err.message : 'Failed to send reminders');
    } finally {
      setReminderLoading(false);
    }
  }

  // ── Modal helpers ───────────────────────────────────────────────────────────

  function openCreate() {
    setForm(BLANK_FORM);
    setFormError('');
    setUploadedFile(null);
    setUploadError('');
    clearLocalPreview();
    setEditTarget(null);
    setModal('create');
  }

  function openEdit(b: Bill) {
    setForm(billToForm(b));
    setFormError('');
    setUploadedFile(
      b.fileUrl
        ? { fileUrl: b.fileUrl, fileName: b.fileName ?? '', fileType: b.fileType ?? '', fileSize: b.fileSize ?? 0 }
        : null
    );
    setUploadError('');
    clearLocalPreview();
    setEditTarget(b);
    setModal('edit');
  }

  function clearLocalPreview() {
    setLocalPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function closeModal() {
    setModal(null);
    clearLocalPreview();
  }

  // ── File upload ─────────────────────────────────────────────────────────────

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    clearLocalPreview();
    if (file.type.startsWith('image/')) {
      setLocalPreview(URL.createObjectURL(file));
    }

    setUploading(true);
    setUploadError('');
    try {
      const res = await adminApi.uploadBillFile(file);
      setUploadedFile({
        fileUrl: res.fileUrl,
        fileName: res.fileName,
        fileType: res.fileType,
        fileSize: res.fileSize,
      });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      clearLocalPreview();
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeFile() {
    setUploadedFile(null);
    clearLocalPreview();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Form submit ─────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    const amount = parseFloat(form.amount);
    const gstAmount = parseFloat(form.gstAmount);

    if (isNaN(amount) || amount < 0) {
      setFormError('Amount must be a valid positive number.');
      return;
    }
    if (isNaN(gstAmount) || gstAmount < 0) {
      setFormError('GST/Tax must be a valid non-negative number.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        billType: form.billType as 'rent' | 'electricity',
        billMonth: form.billMonth,
        invoiceNumber: form.invoiceNumber.trim(),
        billDate: form.billDate,
        dueDate: form.dueDate,
        amount,
        gstAmount,
        status: form.status as 'pending' | 'paid',
        paidDate: form.paidDate || undefined,
        notes: form.notes.trim() || undefined,
        fileUrl: uploadedFile?.fileUrl ?? '',
        fileName: uploadedFile?.fileName ?? '',
        fileType: uploadedFile?.fileType ?? '',
        fileSize: uploadedFile?.fileSize ?? 0,
      };

      if (modal === 'create') {
        await adminApi.createBill(payload);
      } else if (editTarget) {
        await adminApi.updateBill(editTarget._id, payload);
      }

      closeModal();
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeleteError('');
    try {
      await adminApi.deleteBill(id);
      setDeleteConfirm(null);
      load();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  // ── Computed ─────────────────────────────────────────────────────────────────

  const liveTotal = (parseFloat(form.amount) || 0) + (parseFloat(form.gstAmount) || 0);

  const hasActiveFilter = filterMonth || filterYear || filterType || filterStatus;

  function clearFilters() {
    setFilterMonth('');
    setFilterYear('');
    setFilterType('');
    setFilterStatus('');
    setPage(1);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header + Stats + Filters ── */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>
            Office Bills <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-4)' }}>({total})</span>
          </h1>
          <button
            onClick={handleSendReminders}
            disabled={reminderLoading}
            title="Send email reminders for bills due in the next 7 days"
            style={btnSecondarySmall}
          >
            {reminderLoading ? 'Sending…' : '⏰ Reminders'}
          </button>
          <button onClick={handleExport} style={btnSecondarySmall} title="Export to CSV">
            ↓ Export CSV
          </button>
          <button onClick={openCreate} style={btnPrimary}>+ Add Bill</button>
        </div>
        {reminderMsg && (
          <div style={{ marginBottom: 12, padding: '8px 14px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--fg-3)' }}>
            {reminderMsg}
          </div>
        )}

        {/* Stat cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14, marginBottom: 20,
        }}>
          <StatCard
            label="This Month Total"
            value={stats ? fmtINR(stats.totalThisMonth) : '—'}
            sub={stats ? `${stats.thisMonthCount} bills · ${fmtMonth(stats.currentMonth)}` : undefined}
            accent="var(--accent)"
          />
          <StatCard
            label="Pending Bills"
            value={stats ? String(stats.pendingCount) : '—'}
            sub={stats ? fmtINR(stats.pendingAmount) : undefined}
            accent="#fbbf24"
          />
          <StatCard
            label="Paid Bills"
            value={stats ? String(stats.paidCount) : '—'}
            sub={stats ? fmtINR(stats.paidAmount) : undefined}
            accent="#4ade80"
          />
          <StatCard
            label="Due in 7 Days"
            value={stats ? String(stats.upcomingDueCount) : '—'}
            sub={
              stats
                ? stats.upcomingDueCount > 0
                  ? 'Action required'
                  : 'All clear'
                : undefined
            }
            accent={stats && stats.upcomingDueCount > 0 ? '#f87171' : '#4ade80'}
          />
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 16 }}>
          <input
            type="month"
            value={filterMonth}
            title="Filter by specific month"
            onChange={e => { setFilterMonth(e.target.value); setFilterYear(''); setPage(1); }}
            style={{ ...inputSm, minWidth: 140 }}
          />
          <select
            value={filterYear}
            disabled={!!filterMonth}
            onChange={e => { setFilterYear(e.target.value); setFilterMonth(''); setPage(1); }}
            style={{ ...inputSm, opacity: filterMonth ? 0.5 : 1 }}
          >
            <option value="">All years</option>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            style={inputSm}
          >
            <option value="">All types</option>
            {BILL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            style={inputSm}
          >
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasActiveFilter && (
            <button onClick={clearFilters} style={{ ...btnSecondarySmall, color: '#f87171' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>
            No bills found{hasActiveFilter ? ' for the selected filters' : ''}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-1)' }}>
                {['Month', 'Type', 'Invoice #', 'Bill Date', 'Due Date', 'Amount', 'GST', 'Total', 'Status', 'File', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(b => {
                const overdue = isOverdue(b.dueDate, b.status);
                const soon = !overdue && isDueSoon(b.dueDate, b.status);
                return (
                  <tr
                    key={b._id}
                    style={{
                      borderBottom: '1px solid var(--line)',
                      background: overdue ? 'rgba(239,68,68,0.04)' : 'transparent',
                    }}
                  >
                    <td style={td}>{fmtMonth(b.billMonth)}</td>
                    <td style={td}><TypeBadge type={b.billType} /></td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
                      {b.invoiceNumber}
                    </td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>
                      {fmtDate(b.billDate)}
                    </td>
                    <td style={td}>
                      <span style={{
                        fontSize: 12, whiteSpace: 'nowrap',
                        color: overdue ? '#f87171' : soon ? '#fbbf24' : 'var(--fg-3)',
                        fontWeight: overdue || soon ? 600 : 400,
                      }}>
                        {fmtDate(b.dueDate)}
                        {overdue && <span style={{ marginLeft: 5, fontSize: 10, letterSpacing: '0.04em' }}>OVERDUE</span>}
                        {soon && <span style={{ marginLeft: 5, fontSize: 10, letterSpacing: '0.04em' }}>SOON</span>}
                      </span>
                    </td>
                    <td style={{ ...td, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtINR(b.amount)}
                    </td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtINR(b.gstAmount)}
                    </td>
                    <td style={{ ...td, fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtINR(b.totalAmount)}
                    </td>
                    <td style={td}><StatusBadge status={b.status} /></td>
                    <td style={td}>
                      {b.fileUrl ? (
                        <button onClick={() => setPreviewBill(b)} style={btnSecondarySmall}>
                          View
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...td, display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                      <button onClick={() => openEdit(b)} style={btnSecondarySmall}>Edit</button>
                      <button onClick={() => setDeleteConfirm(b._id)} style={btnDanger}>Del</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnPage}>Prev</button>
          <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={btnPage}>Next</button>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: 700, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 22 }}>
              {modal === 'create' ? 'Add Bill' : 'Edit Bill'}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Row: type + month */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Bill Type" required>
                  <select
                    required value={form.billType}
                    onChange={e => setForm(f => ({ ...f, billType: e.target.value }))}
                    style={{ ...inputSm, width: '100%' }}
                  >
                    {BILL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Bill Month" required>
                  <input
                    type="month" required value={form.billMonth}
                    onChange={e => setForm(f => ({ ...f, billMonth: e.target.value }))}
                    style={{ ...inputSm, width: '100%' }}
                  />
                </Field>
              </div>

              {/* Row: invoice + status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Invoice Number" required>
                  <input
                    required value={form.invoiceNumber}
                    onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                    placeholder="e.g. ESIRMC2526/16436"
                    style={{ ...inputSm, width: '100%', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                  />
                </Field>
                <Field label="Payment Status" required>
                  <select
                    required value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    style={{ ...inputSm, width: '100%' }}
                  >
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>

              {/* Row: bill date + due date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Bill Date" required>
                  <input
                    type="date" required value={form.billDate}
                    onChange={e => setForm(f => ({ ...f, billDate: e.target.value }))}
                    style={{ ...inputSm, width: '100%' }}
                  />
                </Field>
                <Field label="Due Date" required>
                  <input
                    type="date" required value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    style={{ ...inputSm, width: '100%' }}
                  />
                </Field>
              </div>

              {/* Row: amounts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <Field label="Amount (₹)" required>
                  <input
                    type="number" required min="0" step="0.01" value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    style={{ ...inputSm, width: '100%' }}
                  />
                </Field>
                <Field label="GST / Tax (₹)" required>
                  <input
                    type="number" required min="0" step="0.01" value={form.gstAmount}
                    onChange={e => setForm(f => ({ ...f, gstAmount: e.target.value }))}
                    placeholder="0.00"
                    style={{ ...inputSm, width: '100%' }}
                  />
                </Field>
                <Field label="Total (auto)">
                  <div style={{ ...inputSm, background: 'var(--bg)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                      {fmtINR(liveTotal)}
                    </span>
                  </div>
                </Field>
              </div>

              {/* Paid date (only when paid) */}
              {form.status === 'paid' && (
                <Field label="Paid On">
                  <input
                    type="date" value={form.paidDate}
                    onChange={e => setForm(f => ({ ...f, paidDate: e.target.value }))}
                    style={{ ...inputSm, width: '100%', maxWidth: 240 }}
                  />
                </Field>
              )}

              {/* Notes */}
              <Field label="Notes / Remarks">
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any additional remarks…"
                  style={{ ...inputSm, width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
              </Field>

              {/* ── File upload ── */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 8 }}>
                  Bill Document <span style={{ color: 'var(--fg-4)', fontWeight: 400 }}>(JPEG · PNG · WebP · PDF · max 10 MB)</span>
                </div>

                {uploadedFile ? (
                  <div style={{
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    padding: '12px 14px', background: 'var(--bg-2)',
                    border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: 72, height: 72, borderRadius: 6,
                      border: '1px solid var(--line)', overflow: 'hidden',
                      flexShrink: 0, background: 'var(--bg)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {localPreview && uploadedFile.fileType.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={localPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-4)', textTransform: 'uppercase' }}>
                          {uploadedFile.fileType === 'application/pdf' ? 'PDF' : 'IMG'}
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {uploadedFile.fileName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 3 }}>
                        {(uploadedFile.fileSize / 1024).toFixed(1)} KB
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button type="button" onClick={() => fileInputRef.current?.click()} style={btnSecondarySmall}>
                          Replace
                        </button>
                        <button type="button" onClick={removeFile} style={{ ...btnDanger, fontSize: 11, padding: '4px 8px' }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && !uploading && fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--line-strong)',
                      borderRadius: 'var(--r-sm)', padding: '28px 16px',
                      textAlign: 'center', cursor: uploading ? 'default' : 'pointer',
                      background: 'var(--bg-2)',
                    }}
                  >
                    {uploading ? (
                      <div style={{ fontSize: 13, color: 'var(--fg-4)' }}>Uploading…</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 28, color: 'var(--fg-4)', marginBottom: 8, lineHeight: 1 }}>↑</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-3)' }}>Click to upload bill document</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>
                          JPEG, PNG, WebP, PDF · Max 10 MB
                        </div>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                {uploadError && (
                  <div style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>{uploadError}</div>
                )}
              </div>

              {/* Form error */}
              {formError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#f87171' }}>
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--line)' }}>
                <button type="button" onClick={closeModal} style={btnSecondary}>Cancel</button>
                <button type="submit" disabled={saving || uploading} style={btnPrimary}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── File Preview Modal ── */}
      {previewBill && (
        <div style={modalOverlay} onClick={() => setPreviewBill(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '92vw', maxWidth: 980, height: '88vh',
              background: 'var(--bg-1)', border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r-md)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Preview header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewBill.fileName || 'Document'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>
                  {typeLabel(previewBill.billType)} · {fmtMonth(previewBill.billMonth)} · {previewBill.invoiceNumber}
                  {' · '}
                  <span style={{ color: previewBill.status === 'paid' ? '#4ade80' : '#fbbf24' }}>
                    {previewBill.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                  {' · '}
                  {fmtINR(previewBill.totalAmount)}
                </div>
              </div>
              <button
                onClick={() => setPreviewBill(null)}
                style={{ background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', fontSize: 24, lineHeight: 1, padding: 4 }}
              >
                ×
              </button>
            </div>
            {/* Preview body */}
            <div style={{ flex: 1, overflow: 'hidden', padding: 16 }}>
              <FilePreview
                fileUrl={previewBill.fileUrl!}
                fileType={previewBill.fileType!}
                fileName={previewBill.fileName!}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Delete bill?</div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20 }}>
              This action cannot be undone. The associated file will also be deleted.
            </div>
            {deleteError && (
              <div style={{ fontSize: 12, color: '#f87171', marginBottom: 12 }}>{deleteError}</div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setDeleteConfirm(null); setDeleteError(''); }} style={btnSecondary}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} style={btnDangerFull}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputSm: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, color: 'var(--fg)',
  background: 'var(--bg-2)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)', outline: 'none',
};
const thStyle: React.CSSProperties = {
  padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)',
  textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)',
  background: 'var(--bg-1)',
};
const td: React.CSSProperties = { padding: '11px 16px', fontSize: 13, color: 'var(--fg)' };
const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff',
  background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)',
  background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnSecondarySmall: React.CSSProperties = {
  padding: '5px 10px', fontSize: 12, color: 'var(--fg-3)',
  background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnDanger: React.CSSProperties = {
  padding: '5px 10px', fontSize: 12, color: '#f87171',
  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnDangerFull: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff',
  background: '#ef4444', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnPage: React.CSSProperties = {
  padding: '5px 12px', fontSize: 12, color: 'var(--fg-3)',
  background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 999,
};
const modalBox: React.CSSProperties = {
  background: 'var(--bg-1)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-md)', padding: '24px', width: 360,
};
