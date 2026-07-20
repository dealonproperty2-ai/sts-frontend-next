'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { adminApi, AdminDeveloperResume, DeveloperType, DeveloperResumeStatus } from '@/lib/adminApi';
import { downloadSecureFile } from '@/lib/useSecureBlob';

const DEVELOPER_TYPES: DeveloperType[] = [
  'Full Stack', 'MERN Stack', 'React', 'Next.js', 'Node.js',
  'Java', 'Python', 'React Native', 'Angular', 'Other',
];

const SORTS: { value: string; label: string }[] = [
  { value: 'updated', label: 'Last Updated' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'experience', label: 'Experience (high → low)' },
  { value: 'type', label: 'Developer Type' },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function expLabel(years: number) {
  if (!years) return 'Fresher';
  return `${years % 1 === 0 ? years : years.toFixed(1)}+ Years`;
}

type FormData = {
  name: string;
  developerType: DeveloperType;
  experienceYears: string;
  primarySkill: string;
  skills: string;
  status: DeveloperResumeStatus;
  notes: string;
  resumeUrl: string; resumeName: string; resumeType: string; resumeSize: number;
  profileImageUrl: string;
};

const BLANK_FORM: FormData = {
  name: '', developerType: 'Full Stack', experienceYears: '', primarySkill: '', skills: '',
  status: 'active', notes: '',
  resumeUrl: '', resumeName: '', resumeType: '', resumeSize: 0, profileImageUrl: '',
};

function toForm(d: AdminDeveloperResume): FormData {
  return {
    name: d.name,
    developerType: d.developerType,
    experienceYears: String(d.experienceYears ?? ''),
    primarySkill: d.primarySkill,
    skills: d.skills.join(', '),
    status: d.status,
    notes: d.notes,
    resumeUrl: d.resumeUrl, resumeName: d.resumeName, resumeType: d.resumeType, resumeSize: d.resumeSize,
    profileImageUrl: d.profileImageUrl,
  };
}

export default function ActiveResumesPage() {
  const [items, setItems] = useState<AdminDeveloperResume[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [devType, setDevType] = useState('');
  const [sort, setSort] = useState('updated');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<AdminDeveloperResume | null>(null);
  const [form, setForm] = useState<FormData>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState<'resume' | 'image' | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<AdminDeveloperResume | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '20', sort };
      if (search) params.search = search;
      if (status) params.status = status;
      if (devType) params.developerType = devType;
      const data = await adminApi.developerResumes(params);
      setItems(data.data);
      setTotal(data.meta.total);
      setPages(data.meta.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, devType, sort]);

  useEffect(() => { load(); }, [load]);

  // Deep-link from the View page's "Edit" button: /admin/active-resumes?edit=<id>
  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (!editId) return;
    adminApi.getDeveloperResume(editId)
      .then(res => {
        setForm(toForm(res.data));
        setEditTarget(res.data);
        setFormError('');
        setModal('edit');
      })
      .catch(() => {})
      .finally(() => window.history.replaceState(null, '', '/admin/active-resumes'));
  }, []);

  // Auto-dismiss the success notice
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  function openCreate() { setForm(BLANK_FORM); setFormError(''); setEditTarget(null); setModal('create'); }
  function openEdit(d: AdminDeveloperResume) { setForm(toForm(d)); setFormError(''); setEditTarget(d); setModal('edit'); }
  function f(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, kind: 'resume' | 'image') {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(kind);
    setFormError('');
    try {
      const r = await adminApi.uploadDeveloperResumeFile(file, kind);
      if (kind === 'resume') {
        setForm(prev => ({ ...prev, resumeUrl: r.fileUrl, resumeName: r.fileName, resumeType: r.fileType, resumeSize: r.fileSize }));
      } else {
        setForm(prev => ({ ...prev, profileImageUrl: r.fileUrl }));
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Developer name is required.'); return; }
    const years = form.experienceYears === '' ? 0 : Number(form.experienceYears);
    if (!Number.isFinite(years) || years < 0 || years > 60) {
      setFormError('Experience must be a number between 0 and 60.'); return;
    }
    setSaving(true);
    try {
      const payload: Partial<AdminDeveloperResume> = {
        name: form.name.trim(),
        developerType: form.developerType,
        experienceYears: years,
        primarySkill: form.primarySkill.trim(),
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        status: form.status,
        notes: form.notes.trim(),
        resumeUrl: form.resumeUrl, resumeName: form.resumeName, resumeType: form.resumeType, resumeSize: form.resumeSize,
        profileImageUrl: form.profileImageUrl,
      };
      if (modal === 'create') { await adminApi.createDeveloperResume(payload); setNotice('Developer resume added.'); }
      else if (editTarget) { await adminApi.updateDeveloperResume(editTarget._id, payload); setNotice('Changes saved.'); }
      setModal(null);
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(d: AdminDeveloperResume) {
    setBusyId(d._id);
    setError('');
    try {
      const next: DeveloperResumeStatus = d.status === 'active' ? 'inactive' : 'active';
      await adminApi.updateDeveloperResume(d._id, { status: next });
      setNotice(`Marked ${next}.`);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDownload(d: AdminDeveloperResume) {
    if (!d.resumeUrl) return;
    setBusyId(d._id);
    try {
      await downloadSecureFile(d.resumeUrl, d.resumeName);
    } catch {
      setError('Download failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError('');
    try {
      await adminApi.deleteDeveloperResume(id);
      setDeleteConfirm(null);
      setNotice('Developer resume deleted.');
      load();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--fg)', flex: 1, minWidth: 140 }}>
          Active Resume <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-4)' }}>({total})</span>
        </h1>
        <input
          placeholder="Search name, skills, type…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ ...inputSm, minWidth: 220 }}
        />
        <select value={devType} onChange={e => { setDevType(e.target.value); setPage(1); }} style={inputSm}>
          <option value="">All types</option>
          {DEVELOPER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={inputSm}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} style={inputSm}>
          {SORTS.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
        </select>
        <button onClick={openCreate} style={btnPrimary}>+ New Developer</button>
      </div>

      {notice && (
        <div style={{ padding: '8px 24px', fontSize: 13, color: '#4ade80', background: 'rgba(34,197,94,0.08)', borderBottom: '1px solid rgba(34,197,94,0.2)' }}>
          {notice}
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
            No developer resumes found. Click <strong>New Developer</strong> to add one.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-1)' }}>
                {['Developer', 'Type', 'Experience', 'Skills', 'Resume', 'Status', 'Last Updated', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(d => (
                <tr key={d._id} style={{ borderBottom: '1px solid var(--line)', opacity: d.status === 'inactive' ? 0.6 : 1 }}>
                  <td style={{ ...td, fontWeight: 600 }}>
                    {d.name}
                    {d.primarySkill && <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--fg-4)' }}>{d.primarySkill}</div>}
                  </td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--accent-soft)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                      {d.developerType}
                    </span>
                  </td>
                  <td style={{ ...td, color: 'var(--fg-2)', fontSize: 12, whiteSpace: 'nowrap' }}>{expLabel(d.experienceYears)}</td>
                  <td style={{ ...td, maxWidth: 240 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {d.skills.slice(0, 3).map(s => (
                        <span key={s} style={{ padding: '1px 7px', borderRadius: 99, fontSize: 11, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-3)' }}>{s}</span>
                      ))}
                      {d.skills.length > 3 && <span style={{ fontSize: 11, color: 'var(--fg-4)', alignSelf: 'center' }}>+{d.skills.length - 3}</span>}
                      {d.skills.length === 0 && <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ ...td, fontSize: 12 }}>
                    {d.resumeUrl
                      ? <button onClick={() => handleDownload(d)} disabled={busyId === d._id} style={linkBtn}>↓ Download</button>
                      : <span style={{ color: 'var(--fg-4)' }}>—</span>}
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => toggleStatus(d)}
                      disabled={busyId === d._id}
                      title="Click to toggle status"
                      style={{
                        padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        background: d.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                        color: d.status === 'active' ? '#4ade80' : '#f87171',
                        border: `1px solid ${d.status === 'active' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.25)'}`,
                      }}
                    >
                      {d.status}
                    </button>
                  </td>
                  <td style={{ ...td, color: 'var(--fg-4)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmt(d.updatedAt)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/admin/active-resumes/${d._id}`} style={{ ...btnSm, textDecoration: 'none' }}>View</Link>
                      <button onClick={() => openEdit(d)} style={btnSm}>Edit</button>
                      <button onClick={() => { setDeleteConfirm(d); setDeleteError(''); }} style={btnDanger}>Del</button>
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
              {modal === 'create' ? 'Add Developer' : 'Edit Developer'}
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="rf-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Developer Name" required>
                  <input required value={form.name} onChange={f('name')} placeholder="e.g. Shams Alam Ansari" style={{ ...inputSm, width: '100%' }} />
                </Field>
                <Field label="Developer Type" required>
                  <select required value={form.developerType} onChange={f('developerType')} style={{ ...inputSm, width: '100%' }}>
                    {DEVELOPER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Experience (years)">
                  <input type="number" min="0" max="60" step="0.5" value={form.experienceYears} onChange={f('experienceYears')} placeholder="5" style={{ ...inputSm, width: '100%' }} />
                </Field>
                <Field label="Primary Skill">
                  <input value={form.primarySkill} onChange={f('primarySkill')} placeholder="React.js" style={{ ...inputSm, width: '100%' }} />
                </Field>
              </div>

              <Field label="Skills (comma-separated)">
                <input value={form.skills} onChange={f('skills')} placeholder="React, Node.js, MongoDB" style={{ ...inputSm, width: '100%' }} />
              </Field>

              <Field label="Resume (PDF, DOC, DOCX — max 10 MB)">
                <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => handleUpload(e, 'resume')} style={{ ...inputSm, width: '100%' }} />
                <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>
                  {uploading === 'resume' ? 'Uploading…' : form.resumeName ? `✓ ${form.resumeName}` : 'No file uploaded yet.'}
                </div>
              </Field>

              <Field label="Profile Image (optional)">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handleUpload(e, 'image')} style={{ ...inputSm, width: '100%' }} />
                <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>
                  {uploading === 'image' ? 'Uploading…' : form.profileImageUrl ? '✓ Image uploaded' : 'Optional.'}
                </div>
              </Field>

              <Field label="Notes">
                <textarea value={form.notes} onChange={f('notes')} rows={3} placeholder="Availability, rate, remarks…" style={{ ...inputSm, width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              </Field>

              <Field label="Status">
                <select value={form.status} onChange={f('status')} style={{ ...inputSm, width: '100%' }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>

              {formError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#f87171' }}>
                  {formError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setModal(null)} style={btnSecondary}>Cancel</button>
                <button type="submit" disabled={saving || !!uploading} style={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Delete developer resume?</div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20 }}>
              “{deleteConfirm.name}” and the uploaded resume file will be permanently removed. This cannot be undone.
            </div>
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
const linkBtn: React.CSSProperties = {
  padding: 0, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none',
  cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff',
  background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)',
  background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnSm: React.CSSProperties = {
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
  borderRadius: 'var(--r-md)', padding: '24px', maxWidth: 'calc(100vw - 24px)',
  boxSizing: 'border-box', width: 380,
};
