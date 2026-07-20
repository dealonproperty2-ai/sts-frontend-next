'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { adminApi, AdminDeveloperResume, DeveloperResumeStatus } from '@/lib/adminApi';
import { useSecureBlob, downloadSecureFile } from '@/lib/useSecureBlob';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function expLabel(years: number) {
  if (!years) return 'Fresher';
  return `${years % 1 === 0 ? years : years.toFixed(1)}+ Years`;
}

function fileSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// PDF renders inline; DOC/DOCX can't be previewed by browsers — offer download.
function ResumePreview({ dev }: { dev: AdminDeveloperResume }) {
  const isPdf = dev.resumeType === 'application/pdf';
  const { blobUrl, loading } = useSecureBlob(isPdf && dev.resumeUrl ? dev.resumeUrl : null);

  if (!dev.resumeUrl) {
    return <Centered>No resume uploaded for this developer.</Centered>;
  }
  if (!isPdf) {
    return <Centered>Preview is only available for PDF files. Use <strong style={{ margin: '0 4px' }}>Download</strong> to open this {dev.resumeName?.split('.').pop()?.toUpperCase() || 'document'}.</Centered>;
  }
  if (loading) return <Centered>Loading resume…</Centered>;
  if (!blobUrl) return <Centered>Preview unavailable.</Centered>;

  return <iframe src={blobUrl} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} title={dev.resumeName || 'Resume'} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 320, color: 'var(--fg-4)', fontSize: 13, textAlign: 'center', padding: 24 }}>
      {children}
    </div>
  );
}

export default function DeveloperResumeViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [dev, setDev] = useState<AdminDeveloperResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { blobUrl: avatarUrl } = useSecureBlob(dev?.profileImageUrl || null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getDeveloperResume(id);
      setDev(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load developer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus() {
    if (!dev) return;
    setBusy(true);
    try {
      const next: DeveloperResumeStatus = dev.status === 'active' ? 'inactive' : 'active';
      const res = await adminApi.updateDeveloperResume(id, { status: next });
      setDev(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!dev?.resumeUrl) return;
    setBusy(true);
    try {
      await downloadSecureFile(dev.resumeUrl, dev.resumeName);
    } catch {
      setError('Download failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await adminApi.deleteDeveloperResume(id);
      router.push('/admin/active-resumes');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href="/admin/active-resumes" style={{ ...btnSm, textDecoration: 'none' }}>← Back</Link>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--fg)', flex: 1, minWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {dev ? dev.name : 'Developer'}
        </h1>
        {dev && (
          <>
            <button onClick={toggleStatus} disabled={busy} style={dev.status === 'active' ? btnSecondary : btnPrimary}>
              {dev.status === 'active' ? 'Mark Inactive' : 'Mark Active'}
            </button>
            {dev.resumeUrl && (
              <button onClick={handleDownload} disabled={busy} style={btnPrimary}>{busy ? 'Working…' : 'Download Resume'}</button>
            )}
            <Link href={`/admin/active-resumes?edit=${dev._id}`} style={{ ...btnSecondary, textDecoration: 'none' }}>Edit</Link>
            <button onClick={() => { setDeleteOpen(true); setDeleteError(''); }} style={btnDangerFull}>Delete</button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="admin-split" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {loading ? (
          <Centered>Loading…</Centered>
        ) : error ? (
          <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        ) : !dev ? (
          <Centered>Developer not found.</Centered>
        ) : (
          <>
            {/* Details */}
            <div className="admin-split-side" style={{ width: 340, flexShrink: 0, borderRight: '1px solid var(--line)', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {avatarUrl ? (
                  <div style={{ position: 'relative', width: 56, height: 56, borderRadius: 99, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--line-strong)' }}>
                    <Image src={avatarUrl} alt={dev.name} fill unoptimized style={{ objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 99, flexShrink: 0, background: 'var(--bg-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--fg-3)' }}>
                    {dev.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)' }}>{dev.name}</div>
                  <span style={{
                    display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: dev.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                    color: dev.status === 'active' ? '#4ade80' : '#f87171',
                  }}>{dev.status}</span>
                </div>
              </div>

              <Row label="Developer Type">
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: 'var(--accent-soft)', color: 'var(--accent)' }}>{dev.developerType}</span>
              </Row>
              <Row label="Experience"><span style={val}>{expLabel(dev.experienceYears)}</span></Row>
              <Row label="Primary Skill"><span style={val}>{dev.primarySkill || '—'}</span></Row>

              <div>
                <Label>Skills ({dev.skills.length})</Label>
                {dev.skills.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {dev.skills.map(s => (
                      <span key={s} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-2)' }}>{s}</span>
                    ))}
                  </div>
                ) : <span style={{ ...val, color: 'var(--fg-4)' }}>—</span>}
              </div>

              <div>
                <Label>Resume File</Label>
                {dev.resumeUrl ? (
                  <div style={{ fontSize: 12, color: 'var(--fg-2)', wordBreak: 'break-all' }}>
                    {dev.resumeName} <span style={{ color: 'var(--fg-4)' }}>{fileSize(dev.resumeSize)}</span>
                  </div>
                ) : <span style={{ ...val, color: 'var(--fg-4)' }}>Not uploaded</span>}
              </div>

              {dev.notes && (
                <div>
                  <Label>Notes</Label>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--fg-2)', whiteSpace: 'pre-wrap' }}>{dev.notes}</p>
                </div>
              )}

              <div style={{ borderTop: '1px dashed var(--line)', paddingTop: 12, fontSize: 12, color: 'var(--fg-4)' }}>
                <div>Added: {fmt(dev.createdAt)}</div>
                <div>Last updated: {fmt(dev.updatedAt)}</div>
              </div>
            </div>

            {/* Preview */}
            <div className="admin-split-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-2)' }}>
              <ResumePreview dev={dev} />
            </div>
          </>
        )}
      </div>

      {/* Delete confirm */}
      {deleteOpen && dev && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Delete developer resume?</div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20 }}>
              “{dev.name}” and the uploaded resume file will be permanently removed. This cannot be undone.
            </div>
            {deleteError && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 12 }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteOpen(false)} disabled={deleting} style={btnSecondary}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={btnDangerFull}>{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-4)', marginBottom: 8 }}>{children}</div>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}

const val: React.CSSProperties = { fontSize: 13, color: 'var(--fg-2)' };
const btnSm: React.CSSProperties = {
  padding: '6px 12px', fontSize: 12, color: 'var(--fg-3)',
  background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff',
  background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)',
  background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnDangerFull: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff',
  background: '#ef4444', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
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
