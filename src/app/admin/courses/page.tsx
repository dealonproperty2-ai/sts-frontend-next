'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { adminApi, AdminCourse } from '@/lib/adminApi';

const TAGS = ['Flagship', 'Cohort', 'Specialist'];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type CourseFormData = {
  slug: string;
  icon: string;
  tag: string;
  title: string;
  dur: string;
  weeks: string;
  classes: string;
  stack: string;
  seats: string;
  price: string;
  priceInr: string;
  desc: string;
  longDesc: string;
  isActive: boolean;
  sortOrder: string;
};

const BLANK_FORM: CourseFormData = {
  slug: '', icon: 'code', tag: 'Cohort', title: '', dur: '', weeks: '',
  classes: '', stack: '', seats: '', price: '', priceInr: '', desc: '',
  longDesc: '', isActive: true, sortOrder: '0',
};

function courseToForm(c: AdminCourse): CourseFormData {
  return {
    slug: c.slug, icon: c.icon, tag: c.tag, title: c.title, dur: c.dur,
    weeks: String(c.weeks), classes: String(c.classes), stack: c.stack,
    seats: String(c.seats), price: c.price, priceInr: String(c.priceInr),
    desc: c.desc, longDesc: c.longDesc, isActive: c.isActive, sortOrder: String(c.sortOrder),
  };
}

export default function CoursesPage() {
  const [items, setItems] = useState<AdminCourse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<AdminCourse | null>(null);
  const [form, setForm] = useState<CourseFormData>(BLANK_FORM);
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
      const data = await adminApi.courses(params);
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

  function openEdit(c: AdminCourse) {
    setForm(courseToForm(c));
    setFormError('');
    setEditTarget(c);
    setModal('edit');
  }

  function f(key: keyof CourseFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const weeks = parseInt(form.weeks, 10);
    const classes = parseInt(form.classes, 10);
    const seats = parseInt(form.seats, 10);
    const priceInr = parseInt(form.priceInr, 10);
    if (isNaN(weeks) || isNaN(classes) || isNaN(seats) || isNaN(priceInr)) {
      setFormError('Weeks, Classes, Seats, and Price INR must be valid numbers.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim(),
        icon: form.icon.trim() || 'code',
        tag: form.tag,
        title: form.title.trim(),
        dur: form.dur.trim(),
        weeks,
        classes,
        stack: form.stack.trim(),
        seats,
        price: form.price.trim(),
        priceInr,
        desc: form.desc.trim(),
        longDesc: form.longDesc.trim(),
        isActive: form.isActive,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };
      if (modal === 'create') {
        await adminApi.createCourse(payload);
      } else if (editTarget) {
        await adminApi.updateCourse(editTarget._id, payload);
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
      await adminApi.deleteCourse(id);
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
          Courses <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-4)' }}>({total})</span>
        </h1>
        <input
          placeholder="Search…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={inputSm}
        />
        <button onClick={openCreate} style={btnPrimary}>+ New Course</button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>No courses yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-1)' }}>
                {['#', 'Title', 'Slug', 'Tag', 'Duration', 'Price', 'Seats', 'Status', 'Updated', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ ...td, color: 'var(--fg-4)', width: 36 }}>{c.sortOrder}</td>
                  <td style={td}>{c.title}</td>
                  <td style={{ ...td, color: 'var(--fg-4)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{c.slug}</td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: c.tag === 'Flagship' ? 'rgba(251,191,36,0.15)' : c.tag === 'Specialist' ? 'rgba(168,85,247,0.15)' : 'rgba(59,130,246,0.15)',
                      color: c.tag === 'Flagship' ? '#fbbf24' : c.tag === 'Specialist' ? '#c084fc' : '#60a5fa',
                    }}>{c.tag}</span>
                  </td>
                  <td style={{ ...td, color: 'var(--fg-3)', fontSize: 12 }}>{c.dur}</td>
                  <td style={{ ...td, color: 'var(--fg-2)', fontSize: 12 }}>{c.price}</td>
                  <td style={{ ...td, color: 'var(--fg-3)', fontSize: 12 }}>{c.seats}</td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: c.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                      color: c.isActive ? '#4ade80' : '#f87171',
                    }}>{c.isActive ? 'active' : 'inactive'}</span>
                  </td>
                  <td style={{ ...td, color: 'var(--fg-4)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmt(c.updatedAt)}</td>
                  <td style={{ ...td, display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(c)} style={btnSecondarySmall}>Edit</button>
                    <button onClick={() => setDeleteConfirm(c._id)} style={btnDanger}>Del</button>
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
              {modal === 'create' ? 'Create Course' : 'Edit Course'}
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Title" required>
                  <input required value={form.title} onChange={f('title')} style={{ ...inputSm, width: '100%' }} />
                </Field>
                <Field label="Slug" required>
                  <input required value={form.slug} onChange={f('slug')} placeholder="e.g. fullstack-web" style={{ ...inputSm, width: '100%', fontFamily: 'var(--font-mono)', fontSize: 12 }} />
                </Field>
                <Field label="Tag" required>
                  <select required value={form.tag} onChange={f('tag')} style={{ ...inputSm, width: '100%' }}>
                    {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Icon (Lucide name)">
                  <input value={form.icon} onChange={f('icon')} placeholder="code" style={{ ...inputSm, width: '100%' }} />
                </Field>
                <Field label="Duration" required>
                  <input required value={form.dur} onChange={f('dur')} placeholder="e.g. 12 Weeks" style={{ ...inputSm, width: '100%' }} />
                </Field>
                <Field label="Weeks" required>
                  <input required type="number" min="1" value={form.weeks} onChange={f('weeks')} style={{ ...inputSm, width: '100%' }} />
                </Field>
                <Field label="Classes" required>
                  <input required type="number" min="1" value={form.classes} onChange={f('classes')} style={{ ...inputSm, width: '100%' }} />
                </Field>
                <Field label="Seats" required>
                  <input required type="number" min="1" value={form.seats} onChange={f('seats')} style={{ ...inputSm, width: '100%' }} />
                </Field>
                <Field label="Price (display)" required>
                  <input required value={form.price} onChange={f('price')} placeholder="e.g. ₹18,000" style={{ ...inputSm, width: '100%' }} />
                </Field>
                <Field label="Price INR (numeric)" required>
                  <input required type="number" min="0" value={form.priceInr} onChange={f('priceInr')} style={{ ...inputSm, width: '100%' }} />
                </Field>
                <Field label="Sort Order">
                  <input type="number" value={form.sortOrder} onChange={f('sortOrder')} style={{ ...inputSm, width: '100%' }} />
                </Field>
              </div>

              <Field label="Tech Stack" required>
                <input required value={form.stack} onChange={f('stack')} placeholder="e.g. React, Node.js, MongoDB" style={{ ...inputSm, width: '100%' }} />
              </Field>
              <Field label="Short Description" required>
                <textarea required value={form.desc} onChange={f('desc')} rows={2} style={{ ...inputSm, width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              </Field>
              <Field label="Long Description" required>
                <textarea required value={form.longDesc} onChange={f('longDesc')} rows={4} style={{ ...inputSm, width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              </Field>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--fg-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                Active (visible on site)
              </label>

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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Delete course?</div>
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
  borderRadius: 'var(--r-md)', padding: '24px', width: 340,
};
