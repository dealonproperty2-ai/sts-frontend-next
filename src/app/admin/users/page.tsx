'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { adminApi, AdminUser } from '@/lib/adminApi';

const ROLES = ['admin', 'user'];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type UserFormData = {
  email: string;
  name: string;
  phone: string;
  role: string;
  password: string;
  isActive: boolean;
};

const BLANK_FORM: UserFormData = { email: '', name: '', phone: '', role: 'user', password: '', isActive: true };

export default function UsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserFormData>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      const data = await adminApi.users(params);
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

  function openCreate() {
    setForm(BLANK_FORM);
    setFormError('');
    setEditTarget(null);
    setModal('create');
  }

  function openEdit(u: AdminUser) {
    setForm({ email: u.email, name: u.name ?? '', phone: u.phone ?? '', role: u.role, password: '', isActive: u.isActive });
    setFormError('');
    setEditTarget(u);
    setModal('edit');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (modal === 'create') {
        await adminApi.createUser({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim() || undefined,
          phone: form.phone.trim() || undefined,
          role: form.role,
        });
      } else if (editTarget) {
        const body: Parameters<typeof adminApi.updateUser>[1] = {
          name: form.name.trim() || undefined,
          phone: form.phone.trim() || undefined,
          role: form.role,
          isActive: form.isActive,
        };
        if (form.password) body.password = form.password;
        await adminApi.updateUser(editTarget._id, body);
      }
      setModal(null);
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError('');
    try {
      await adminApi.deleteUser(id);
      setDeleteConfirm(null);
      load();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>
          Users <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-4)' }}>({total})</span>
        </h1>
        <input
          placeholder="Search…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={inputSm}
        />
        <button onClick={openCreate} style={btnPrimary}>+ New User</button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>No users found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-1)' }}>
                {['Name', 'Email', 'Phone', 'Role', 'Status', 'Created', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(u => (
                <tr key={u._id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={td}>{u.name || '—'}</td>
                  <td style={{ ...td, color: 'var(--fg-3)', fontSize: 12 }}>{u.email}</td>
                  <td style={{ ...td, color: 'var(--fg-3)', fontSize: 12 }}>{u.phone || '—'}</td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: u.role === 'admin' ? 'rgba(168,85,247,0.15)' : 'var(--bg-2)',
                      color: u.role === 'admin' ? '#c084fc' : 'var(--fg-3)',
                    }}>{u.role}</span>
                  </td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: u.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                      color: u.isActive ? '#4ade80' : '#f87171',
                    }}>{u.isActive ? 'active' : 'inactive'}</span>
                  </td>
                  <td style={{ ...td, color: 'var(--fg-4)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmt(u.createdAt)}</td>
                  <td style={{ ...td, display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(u)} style={btnSecondarySmall}>Edit</button>
                    <button onClick={() => setDeleteConfirm(u._id)} style={btnDanger}>Del</button>
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

      {/* Create / Edit modal */}
      {modal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: 440 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 20 }}>
              {modal === 'create' ? 'Create User' : 'Edit User'}
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Email" required>
                <input
                  type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  disabled={modal === 'edit'}
                  style={{ ...inputSm, width: '100%', opacity: modal === 'edit' ? 0.6 : 1 }}
                />
              </Field>
              <Field label="Name">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputSm, width: '100%' }} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ ...inputSm, width: '100%' }} />
              </Field>
              <Field label="Role">
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ ...inputSm, width: '100%' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label={modal === 'edit' ? 'New Password (leave blank to keep)' : 'Password'} required={modal === 'create'}>
                <input
                  type="password" value={form.password}
                  required={modal === 'create'}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ ...inputSm, width: '100%' }}
                />
              </Field>
              {modal === 'edit' && (
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--fg-2)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                  Active
                </label>
              )}
              {formError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#f87171' }}>
                  {formError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setModal(null)} style={btnSecondary}>Cancel</button>
                <button type="submit" disabled={saving} style={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Delete user?</div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20 }}>This action cannot be undone.</div>
            {deleteError && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 12 }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setDeleteConfirm(null); setDeleteError(''); }} style={btnSecondary}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={btnDangerFull}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>
        {label}{required && <span style={{ color: '#f87171' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputSm: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, color: 'var(--fg)',
  background: 'var(--bg-2)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)', outline: 'none',
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
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 999,
};
const modalBox: React.CSSProperties = {
  background: 'var(--bg-1)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-md)', padding: '24px', maxWidth: 'calc(100vw - 24px)', boxSizing: 'border-box', width: 340,
};
