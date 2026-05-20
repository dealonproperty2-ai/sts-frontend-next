'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, Application } from '@/lib/adminApi';

const STATUSES = ['new', 'reviewed', 'shortlisted', 'rejected', 'hired'];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  new: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  reviewed: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  shortlisted: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  hired: { bg: 'rgba(34,197,94,0.25)', color: '#22c55e' },
  rejected: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
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

export default function ApplicationsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Application | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const data = await adminApi.applications(params);
      setItems(data.data);
      setTotal(data.meta.total);
      setPages(data.meta.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  function openDetail(a: Application) {
    setSelected(a);
    setNotes(a.adminNotes ?? '');
    setNewStatus(a.status);
  }

  async function saveChanges() {
    if (!selected) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await adminApi.updateApplication(selected._id, { status: newStatus, adminNotes: notes });
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
      await adminApi.deleteApplication(id);
      setDeleteConfirm(null);
      if (selected?._id === id) setSelected(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* List panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: selected ? '1px solid var(--line)' : 'none' }}>
        {/* Toolbar */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>
            Applications <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-4)' }}>({total})</span>
          </h1>
          <input
            placeholder="Search…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={inputSm}
          />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={inputSm}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
          ) : error ? (
            <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>No applications found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-1)' }}>
                  {['Name', 'Role', 'Email', 'Date', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(a => (
                  <tr
                    key={a._id}
                    onClick={() => openDetail(a)}
                    onKeyDown={e => e.key === 'Enter' && openDetail(a)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View application from ${a.name}`}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--line)', background: selected?._id === a._id ? 'var(--accent-soft)' : 'transparent', outline: 'none' }}
                  >
                    <td style={td}>{a.name}</td>
                    <td style={{ ...td, color: 'var(--fg-3)' }}>{a.role}</td>
                    <td style={{ ...td, color: 'var(--fg-3)', fontSize: 12 }}>{a.email}</td>
                    <td style={{ ...td, color: 'var(--fg-4)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmt(a.createdAt)}</td>
                    <td style={td}><StatusBadge status={a.status} /></td>
                    <td style={td}>
                      <button
                        onClick={ev => { ev.stopPropagation(); setDeleteConfirm(a._id); }}
                        aria-label={`Delete application from ${a.name}`}
                        style={btnDanger}
                      >Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnPage}>Prev</button>
            <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={btnPage}>Next</button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ width: 360, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>{selected.role}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Email', selected.email],
              ['Phone', selected.phone],
              ['Portfolio', selected.portfolio],
              ['Submitted', fmt(selected.createdAt)],
            ].map(([l, v]) => v ? (
              <div key={l}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', wordBreak: 'break-all' }}>{v}</div>
              </div>
            ) : null)}

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Message</div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.message}</div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Status</div>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ ...inputSm, width: '100%' }}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Admin Notes</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                style={{ ...inputSm, width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                placeholder="Internal notes…"
              />
            </div>
          </div>

          {saveError && (
            <div style={{ padding: '8px 24px', fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.08)' }}>
              {saveError}
            </div>
          )}
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
            <button onClick={saveChanges} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button onClick={() => setDeleteConfirm(selected._id)} style={btnDanger}>Delete</button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Delete application?</div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20 }}>This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={btnSecondary}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={btnDangerFull}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputSm: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: 13,
  color: 'var(--fg)',
  background: 'var(--bg-2)',
  border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)',
  outline: 'none',
};

const td: React.CSSProperties = { padding: '11px 16px', fontSize: 13, color: 'var(--fg)' };

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff',
  background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
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

const btnSecondary: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)',
  background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};

const btnPage: React.CSSProperties = {
  padding: '5px 12px', fontSize: 12, color: 'var(--fg-3)',
  background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 999,
};

const modalBox: React.CSSProperties = {
  background: 'var(--bg-1)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-md)', padding: '24px', width: 340,
};
