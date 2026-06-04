'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, AdminProject } from '@/lib/adminApi';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [project, setProject] = useState<AdminProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getProject(id);
      setProject(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await adminApi.deleteProject(id);
      router.push('/admin/projects');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href="/admin/projects" style={{ ...btnSecondarySmall, textDecoration: 'none' }}>← Back</Link>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>
          Project Details
        </h1>
        {project && (
          <>
            <Link href={`/admin/projects?edit=${project._id}`} style={{ ...btnSecondary, textDecoration: 'none' }}>Edit</Link>
            <button onClick={() => { setDeleteOpen(true); setDeleteError(''); }} style={btnDangerFull}>Delete</button>
          </>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        ) : !project ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Project not found</div>
        ) : (
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header card */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--fg)', flex: 1, minWidth: 200 }}>{project.title}</h2>
                <CopyButton text={project.title} label="title" />
                <span style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: project.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                  color: project.isActive ? '#4ade80' : '#f87171',
                }}>{project.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  {project.category}
                </span>
                {project.clientName && (
                  <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>
                    Client: <span style={{ color: 'var(--fg-2)', fontWeight: 500 }}>{project.clientName}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <Section title="Description" copyText={project.description}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--fg-2)', whiteSpace: 'pre-wrap' }}>
                {project.description}
              </p>
            </Section>

            {/* Technologies */}
            <Section title={`Technologies / Skills (${project.technologies.length})`} copyText={project.technologies.join(', ')}>
              {project.technologies.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {project.technologies.map(t => (
                    <span key={t} style={{ padding: '4px 12px', borderRadius: 99, fontSize: 13, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-2)' }}>{t}</span>
                  ))}
                </div>
              ) : <Empty />}
            </Section>

            {/* Links */}
            <Section title="Links">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <LinkRow label="Demo / Project URL" url={project.projectUrl} />
                <LinkRow label="GitHub / Repository" url={project.repoUrl} />
              </div>
            </Section>

            {/* Meta */}
            <Section title="Metadata">
              <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 10, columnGap: 16, fontSize: 13 }}>
                <Meta label="Sort order" value={String(project.sortOrder)} />
                <Meta label="Created" value={fmt(project.createdAt)} />
                <Meta label="Last updated" value={fmt(project.updatedAt)} />
                <Meta label="Project ID" value={project._id} mono />
              </dl>
            </Section>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteOpen && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Delete project?</div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20 }}>
              “{project?.title}” will be permanently removed. This cannot be undone.
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

function Section({ title, children, copyText }: { title: string; children: React.ReactNode; copyText?: string }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-4)' }}>
          {title}
        </div>
        {copyText ? <CopyButton text={copyText} label={title} /> : null}
      </div>
      {children}
    </div>
  );
}

// Copies `text` to the clipboard with brief "Copied" feedback. Falls back to a
// hidden textarea + execCommand when the async Clipboard API is unavailable.
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!text}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        padding: '5px 10px', fontSize: 12, fontWeight: 500,
        color: copied ? '#4ade80' : 'var(--fg-3)',
        background: 'var(--bg-2)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'var(--line)'}`,
        borderRadius: 'var(--r-sm)', cursor: text ? 'pointer' : 'not-allowed',
        whiteSpace: 'nowrap', transition: 'color var(--t-fast), border-color var(--t-fast)',
      }}
    >
      {copied ? '✓ Copied' : '⧉ Copy'}
    </button>
  );
}

function LinkRow({ label, url }: { label: string; url: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, color: 'var(--fg-4)', width: 160, flexShrink: 0 }}>{label}</span>
      {url
        ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', wordBreak: 'break-all' }}>{url} ↗</a>
        : <span style={{ fontSize: 13, color: 'var(--fg-4)' }}>— not provided</span>}
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt style={{ color: 'var(--fg-4)' }}>{label}</dt>
      <dd style={{ margin: 0, color: 'var(--fg-2)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', fontSize: mono ? 12 : 13, wordBreak: 'break-all' }}>{value}</dd>
    </>
  );
}

function Empty() {
  return <span style={{ fontSize: 13, color: 'var(--fg-4)' }}>—</span>;
}

const card: React.CSSProperties = {
  background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 20,
};
const btnSecondary: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)',
  background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnSecondarySmall: React.CSSProperties = {
  padding: '6px 12px', fontSize: 12, color: 'var(--fg-3)',
  background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const btnDangerFull: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff',
  background: '#ef4444', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
};
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 999,
};
const modalBox: React.CSSProperties = {
  background: 'var(--bg-1)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-md)', padding: '24px', maxWidth: 'calc(100vw - 24px)', boxSizing: 'border-box', width: 380,
};
