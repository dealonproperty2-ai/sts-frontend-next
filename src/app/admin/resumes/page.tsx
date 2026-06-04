'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminApi, AdminResume } from '@/lib/adminApi';

const TEMPLATE_LABEL: Record<string, string> = { classic: 'Classic', modern: 'Modern', minimal: 'Minimal' };

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ResumesPage() {
  const [items, setItems] = useState<AdminResume[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<AdminResume | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      const data = await adminApi.resumes(params);
      setItems(data.data);
      setTotal(data.meta.total);
      setPages(data.meta.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setDeleteError('');
    try {
      await adminApi.deleteResume(id);
      setDeleteConfirm(null);
      load();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>
          Resumes <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-4)' }}>({total})</span>
        </h1>
        <input
          placeholder="Search name, headline, email, skills…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ ...inputSm, minWidth: 260 }}
        />
        <Link href="/admin/resumes/new" style={{ ...btnPrimary, textDecoration: 'none' }}>+ New Resume</Link>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>
            No resumes yet. Click <strong>New Resume</strong> to create one.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-1)' }}>
                {['Name', 'Headline', 'Template', 'Skills', 'Updated', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r._id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ ...td, fontWeight: 600 }}>{r.fullName}</td>
                  <td style={{ ...td, color: 'var(--fg-3)', fontSize: 12 }}>{r.headline || '—'}</td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {TEMPLATE_LABEL[r.template] ?? r.template}
                    </span>
                  </td>
                  <td style={{ ...td, color: 'var(--fg-4)', fontSize: 12 }}>{r.skills.length}</td>
                  <td style={{ ...td, color: 'var(--fg-4)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmt(r.updatedAt)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/admin/resumes/${r._id}`} style={{ ...btnSm, textDecoration: 'none' }}>View</Link>
                      <Link href={`/admin/resumes/${r._id}/edit`} style={{ ...btnSm, textDecoration: 'none' }}>Edit</Link>
                      <button onClick={() => { setDeleteConfirm(r); setDeleteError(''); }} style={btnDanger}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnPage}>Prev</button>
          <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={btnPage}>Next</button>
        </div>
      )}

      {deleteConfirm && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Delete resume?</div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20 }}>“{deleteConfirm.fullName}” will be permanently removed. This cannot be undone.</div>
            {deleteError && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 12 }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={btnSecondary}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm._id)} style={btnDangerFull}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputSm: React.CSSProperties = { padding: '7px 10px', fontSize: 13, color: 'var(--fg)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none' };
const td: React.CSSProperties = { padding: '11px 16px', fontSize: 13, color: 'var(--fg)' };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { padding: '8px 18px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnSm: React.CSSProperties = { padding: '5px 10px', fontSize: 12, color: 'var(--fg-3)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnDanger: React.CSSProperties = { padding: '5px 10px', fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnDangerFull: React.CSSProperties = { padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#ef4444', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnPage: React.CSSProperties = { padding: '5px 12px', fontSize: 12, color: 'var(--fg-3)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 };
const modalBox: React.CSSProperties = { background: 'var(--bg-1)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', padding: '24px', maxWidth: 'calc(100vw - 24px)', boxSizing: 'border-box', width: 380 };
