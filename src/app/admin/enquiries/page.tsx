'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, Enquiry } from '@/lib/adminApi';

const STATUSES = ['new', 'open', 'closed'];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  new: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  open: { bg: 'rgba(234,179,8,0.15)', color: '#facc15' },
  closed: { bg: 'rgba(107,114,128,0.2)', color: '#9ca3af' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: 'var(--bg-2)', color: 'var(--fg-3)' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function EnquiriesPage() {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newStatus, setNewStatus] = useState('');

  // Bulk ops
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setChecked(new Set());
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (showTrash) params.deleted = 'true';
      const data = await adminApi.enquiries(params);
      setItems(data.data);
      setTotal(data.meta.total);
      setPages(data.meta.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, showTrash]);

  useEffect(() => { load(); }, [load]);

  function openDetail(e: Enquiry) {
    setSelected(e);
    setNewStatus(e.status);
  }

  async function saveStatus() {
    if (!selected) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await adminApi.updateEnquiry(selected._id, { status: newStatus });
      setItems(prev => prev.map(x => x._id === selected._id ? updated.data : x));
      setSelected(updated.data);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await adminApi.deleteEnquiry(id);
      setDeleteConfirm(null);
      if (selected?._id === id) setSelected(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleRestore(id: string) {
    try {
      await adminApi.updateEnquiry(id, { restore: true });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    }
  }

  function toggleCheck(id: string) {
    setChecked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleAll() {
    if (checked.size === items.length) setChecked(new Set());
    else setChecked(new Set(items.map(i => i._id)));
  }

  async function runBulk(action: string) {
    if (!checked.size) return;
    setBulkLoading(true);
    setBulkMsg('');
    try {
      const result = await adminApi.bulkEnquiries([...checked], action, action === 'update_status' ? bulkStatus : undefined);
      setBulkMsg(`${result.modified} record${result.modified !== 1 ? 's' : ''} updated`);
      setChecked(new Set());
      load();
    } catch (err: unknown) {
      setBulkMsg(err instanceof Error ? err.message : 'Bulk operation failed');
    } finally {
      setBulkLoading(false);
    }
  }

  function doExport() {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    adminApi.exportEnquiries(Object.keys(params).length ? params : undefined);
  }

  const allChecked = items.length > 0 && checked.size === items.length;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: selected ? '1px solid var(--line)' : 'none' }}>
        {/* Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--fg)', minWidth: 120 }}>
            Enquiries <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-4)' }}>({total})</span>
          </h1>
          <input placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={inputSm} />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={inputSm}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => { setShowTrash(!showTrash); setPage(1); setSelected(null); }} style={{ ...btnSecondary, background: showTrash ? 'var(--accent-soft)' : undefined, color: showTrash ? 'var(--accent)' : undefined }}>
            {showTrash ? '← Active' : 'Trash'}
          </button>
          <button onClick={doExport} style={btnSecondary} title="Export as CSV">CSV</button>
        </div>

        {/* Bulk bar */}
        {checked.size > 0 && (
          <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--line)', background: 'var(--accent-soft)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{checked.size} selected</span>
            {!showTrash && (
              <>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={inputSm}>
                  <option value="">Set status…</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button disabled={!bulkStatus || bulkLoading} onClick={() => runBulk('update_status')} style={btnPrimary}>Apply</button>
                <button disabled={bulkLoading} onClick={() => runBulk('delete')} style={{ ...btnDanger, padding: '6px 12px' }}>Move to trash</button>
              </>
            )}
            {showTrash && (
              <button disabled={bulkLoading} onClick={() => runBulk('restore')} style={btnPrimary}>Restore selected</button>
            )}
            {bulkMsg && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{bulkMsg}</span>}
          </div>
        )}

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
          ) : error ? (
            <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>
              {showTrash ? 'Trash is empty' : 'No enquiries found'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-1)' }}>
                  <th style={thStyle}>
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                  </th>
                  {['Name', 'Service', 'Country', 'Date', 'Status', ''].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(enq => (
                  <tr
                    key={enq._id}
                    style={{
                      cursor: 'pointer', borderBottom: '1px solid var(--line)',
                      background: selected?._id === enq._id ? 'var(--accent-soft)' : checked.has(enq._id) ? 'rgba(99,102,241,0.06)' : 'transparent',
                    }}
                  >
                    <td style={{ ...td, width: 40 }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={checked.has(enq._id)} onChange={() => toggleCheck(enq._id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={td} onClick={() => openDetail(enq)}>
                      <div style={{ fontSize: 13 }}>{enq.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{enq.email}</div>
                    </td>
                    <td style={{ ...td, color: 'var(--fg-3)', fontSize: 12 }} onClick={() => openDetail(enq)}>{enq.service || '—'}</td>
                    <td style={{ ...td, color: 'var(--fg-3)', fontSize: 12 }} onClick={() => openDetail(enq)}>{enq.country || '—'}</td>
                    <td style={{ ...td, color: 'var(--fg-4)', fontSize: 12, whiteSpace: 'nowrap' }} onClick={() => openDetail(enq)}>{fmt(enq.createdAt)}</td>
                    <td style={td} onClick={() => openDetail(enq)}><StatusBadge status={enq.status} /></td>
                    <td style={td} onClick={e => e.stopPropagation()}>
                      {showTrash ? (
                        <button onClick={() => handleRestore(enq._id)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }}>Restore</button>
                      ) : (
                        <button onClick={() => setDeleteConfirm(enq._id)} style={btnDanger}>Del</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnPage}>Prev</button>
            <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={btnPage}>Next</button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ width: 380, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>{selected.email}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {([['Phone', selected.phone], ['Country', selected.country], ['Service', selected.service], ['Budget', selected.budget], ['Submitted', fmt(selected.createdAt)]] as [string, string | undefined][]).map(([l, v]) => v ? (
              <div key={l}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{v}</div>
              </div>
            ) : null)}

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Message</div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.message}</div>
            </div>

            {!selected.deletedAt && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Status</div>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ ...inputSm, width: '100%' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {selected.deletedAt && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#f87171' }}>
                Moved to trash on {fmt(selected.deletedAt)}
              </div>
            )}
          </div>

          {saveError && (
            <div style={{ padding: '8px 20px', fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.08)' }}>{saveError}</div>
          )}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
            {selected.deletedAt ? (
              <button onClick={() => handleRestore(selected._id)} style={{ ...btnPrimary, flex: 1 }}>Restore</button>
            ) : (
              <>
                <button onClick={saveStatus} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>{saving ? 'Saving…' : 'Update status'}</button>
                <button onClick={() => setDeleteConfirm(selected._id)} style={btnDanger}>Trash</button>
              </>
            )}
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Move to trash?</div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20 }}>The enquiry will be moved to trash and can be restored later.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={btnSecondary}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={btnDangerFull}>Move to trash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputSm: React.CSSProperties = { padding: '7px 10px', fontSize: 13, color: 'var(--fg)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none' };
const thStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' };
const td: React.CSSProperties = { padding: '10px 14px', fontSize: 13, color: 'var(--fg)' };
const btnPrimary: React.CSSProperties = { padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnDanger: React.CSSProperties = { padding: '5px 10px', fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnDangerFull: React.CSSProperties = { padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#ef4444', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { padding: '7px 12px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnPage: React.CSSProperties = { padding: '5px 12px', fontSize: 12, color: 'var(--fg-3)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 };
const modalBox: React.CSSProperties = { background: 'var(--bg-1)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', padding: '24px', maxWidth: 'calc(100vw - 24px)', boxSizing: 'border-box', width: 360 };
