'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { adminApi, AdminProject } from '@/lib/adminApi';

// Suggested categories — the model stores a free string, so admins can also type
// their own via the "Other…" option without being blocked by an enum.
const CATEGORIES = [
  'Web Development',
  'Mobile App',
  'E-Commerce',
  'SaaS Product',
  'UI/UX Design',
  'API / Backend',
  'DevOps / Cloud',
  'Other',
];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type ProjectFormData = {
  title: string;
  category: string;
  clientName: string;
  technologies: string;
  projectUrl: string;
  repoUrl: string;
  description: string;
  isActive: boolean;
  sortOrder: string;
};

const BLANK_FORM: ProjectFormData = {
  title: '', category: CATEGORIES[0], clientName: '', technologies: '',
  projectUrl: '', repoUrl: '', description: '', isActive: true, sortOrder: '0',
};

function projectToForm(p: AdminProject): ProjectFormData {
  return {
    title: p.title,
    category: p.category,
    clientName: p.clientName,
    technologies: p.technologies.join(', '),
    projectUrl: p.projectUrl,
    repoUrl: p.repoUrl,
    description: p.description,
    isActive: p.isActive,
    sortOrder: String(p.sortOrder),
  };
}

export default function ProjectsPage() {
  const [items, setItems] = useState<AdminProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<AdminProject | null>(null);
  const [form, setForm] = useState<ProjectFormData>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      const data = await adminApi.projects(params);
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

  // Deep-link from the detail page's "Edit" button: /admin/projects?edit=<id>
  // opens the edit modal for that project, then cleans the URL.
  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (!editId) return;
    adminApi.getProject(editId)
      .then(res => {
        setForm(projectToForm(res.data));
        setEditTarget(res.data);
        setFormError('');
        setModal('edit');
      })
      .catch(() => {})
      .finally(() => window.history.replaceState(null, '', '/admin/projects'));
  }, []);

  function openCreate() {
    setForm(BLANK_FORM);
    setFormError('');
    setEditTarget(null);
    setModal('create');
  }

  function openEdit(p: AdminProject) {
    setForm(projectToForm(p));
    setFormError('');
    setEditTarget(p);
    setModal('edit');
  }

  function f(key: keyof ProjectFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    const technologies = form.technologies.split(',').map(t => t.trim()).filter(Boolean);
    if (technologies.length === 0) {
      setFormError('Add at least one technology (comma-separated).');
      return;
    }
    const url = form.projectUrl.trim();
    const repo = form.repoUrl.trim();
    if (url && !/^https?:\/\/.+/i.test(url)) {
      setFormError('Project URL must start with http:// or https://');
      return;
    }
    if (repo && !/^https?:\/\/.+/i.test(repo)) {
      setFormError('Repository URL must start with http:// or https://');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim(),
        clientName: form.clientName.trim(),
        technologies,
        projectUrl: url,
        repoUrl: repo,
        description: form.description.trim(),
        isActive: form.isActive,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };
      if (modal === 'create') {
        await adminApi.createProject(payload);
      } else if (editTarget) {
        await adminApi.updateProject(editTarget._id, payload);
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
      await adminApi.deleteProject(id);
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
          Projects <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-4)' }}>({total})</span>
        </h1>
        <input
          placeholder="Search title, category, client, tech…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ ...inputSm, minWidth: 240 }}
        />
        <button onClick={openCreate} style={btnPrimary}>+ New Project</button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>No projects yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-1)' }}>
                {['#', 'Title', 'Category', 'Technologies', 'Client', 'Links', 'Status', 'Updated', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ ...td, color: 'var(--fg-4)', width: 36 }}>{p.sortOrder}</td>
                  <td style={{ ...td, fontWeight: 500, maxWidth: 220 }}>{p.title}</td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {p.category}
                    </span>
                  </td>
                  <td style={{ ...td, maxWidth: 260 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {p.technologies.slice(0, 4).map(t => (
                        <span key={t} style={{ padding: '1px 7px', borderRadius: 99, fontSize: 11, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-3)' }}>{t}</span>
                      ))}
                      {p.technologies.length > 4 && (
                        <span style={{ fontSize: 11, color: 'var(--fg-4)', alignSelf: 'center' }}>+{p.technologies.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...td, color: 'var(--fg-3)', fontSize: 12 }}>{p.clientName || '—'}</td>
                  <td style={{ ...td, fontSize: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {p.projectUrl
                        ? <a href={p.projectUrl} target="_blank" rel="noopener noreferrer" style={linkStyle} title={p.projectUrl}>Demo ↗</a>
                        : <span style={{ color: 'var(--fg-4)' }}>—</span>}
                      {p.repoUrl
                        ? <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" style={linkStyle} title={p.repoUrl}>Repo ↗</a>
                        : null}
                    </div>
                  </td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: p.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                      color: p.isActive ? '#4ade80' : '#f87171',
                    }}>{p.isActive ? 'active' : 'inactive'}</span>
                  </td>
                  <td style={{ ...td, color: 'var(--fg-4)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmt(p.updatedAt)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/admin/projects/${p._id}`} style={{ ...btnSecondarySmall, textDecoration: 'none' }}>View</Link>
                      <button onClick={() => openEdit(p)} style={btnSecondarySmall}>Edit</button>
                      <button onClick={() => setDeleteConfirm(p._id)} style={btnDanger}>Del</button>
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
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnPage}>Prev</button>
          <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={btnPage}>Next</button>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 20 }}>
              {modal === 'create' ? 'Add Project' : 'Edit Project'}
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Project Title" required>
                <input required value={form.title} onChange={f('title')} placeholder="e.g. Acme Logistics Dashboard" style={{ ...inputSm, width: '100%' }} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Category" required>
                  <select required value={form.category} onChange={f('category')} style={{ ...inputSm, width: '100%' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Client Name">
                  <input value={form.clientName} onChange={f('clientName')} placeholder="Optional" style={{ ...inputSm, width: '100%' }} />
                </Field>
              </div>

              <Field label="Technologies / Skills Used" required>
                <input required value={form.technologies} onChange={f('technologies')} placeholder="Comma-separated, e.g. React, Node.js, MongoDB" style={{ ...inputSm, width: '100%' }} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Project URL / Demo Link">
                  <input value={form.projectUrl} onChange={f('projectUrl')} placeholder="https://… (optional)" style={{ ...inputSm, width: '100%' }} />
                </Field>
                <Field label="GitHub / Repository Link">
                  <input value={form.repoUrl} onChange={f('repoUrl')} placeholder="https://… (optional)" style={{ ...inputSm, width: '100%' }} />
                </Field>
              </div>

              <Field label="Project Description" required>
                <textarea required value={form.description} onChange={f('description')} rows={4} placeholder="What the project does, your role, outcomes…" style={{ ...inputSm, width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'end' }}>
                <Field label="Sort Order">
                  <input type="number" value={form.sortOrder} onChange={f('sortOrder')} style={{ ...inputSm, width: '100%' }} />
                </Field>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--fg-2)', cursor: 'pointer', paddingBottom: 8 }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                  Active (shown in portfolio)
                </label>
              </div>

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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Delete project?</div>
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
const td: React.CSSProperties = { padding: '11px 16px', fontSize: 13, color: 'var(--fg)', verticalAlign: 'top' };
const linkStyle: React.CSSProperties = { color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' };
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
  borderRadius: 'var(--r-md)', padding: '24px', width: 340,
};
