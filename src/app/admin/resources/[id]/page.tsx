'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, AdminResource } from '@/lib/adminApi';
import { AVAILABILITY_OPTIONS } from '@/components/ResourceForm';
import { downloadCandidateProfile } from '@/lib/resourcePdf';

const availMeta = (s: string) => AVAILABILITY_OPTIONS.find(o => o.value === s) ?? { value: s, label: s, color: '#64748B' };

function authHeaders(): Record<string, string> {
  const t = typeof window !== 'undefined' ? localStorage.getItem('sts-admin-token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function openResume(r: AdminResource, mode: 'preview' | 'download') {
  if (!r.resumeUrl) return;
  const res = await fetch(r.resumeUrl, { headers: authHeaders() });
  if (!res.ok) { alert('Could not load resume file.'); return; }
  const url = URL.createObjectURL(await res.blob());
  if (mode === 'preview') { window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
  else { const a = document.createElement('a'); a.href = url; a.download = r.resumeName || `${r.fullName}-Resume`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
}
function fmtDate(v?: string) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [r, setR] = useState<AdminResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const res = await adminApi.getResource(id); setR(res.data); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function doDelete() {
    try { await adminApi.deleteResource(id); router.push('/admin/resources'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Delete failed'); setConfirmDelete(false); }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>;
  if (error || !r) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ color: '#f87171', fontSize: 14, marginBottom: 12 }}>{error || 'Resource not found'}</div>
      <Link href="/admin/resources" style={backLink}>← Back to resources</Link>
    </div>
  );

  const av = availMeta(r.availabilityStatus);
  const emp = typeof r.employee === 'object' && r.employee ? r.employee : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/admin/resources" style={backLink}>← Back</Link>
        <div style={{ flex: 1 }} />
        {r.resumeUrl && <button style={btn} onClick={() => openResume(r, 'preview')}>Preview CV</button>}
        {r.resumeUrl && <button style={btn} onClick={() => openResume(r, 'download')}>Download CV</button>}
        <button style={btnPrimary} disabled={pdfBusy} onClick={async () => {
          setPdfBusy(true); setPdfErr('');
          try { await downloadCandidateProfile(r); }
          catch (err) { console.error('[resource-detail] profile PDF failed', err); setPdfErr(err instanceof Error ? err.message : 'PDF generation failed'); }
          finally { setPdfBusy(false); }
        }}>{pdfBusy ? 'Generating…' : '📄 Download Profile PDF'}</button>
        <Link href={`/admin/resources?edit=${r._id}`} style={{ ...btn, textDecoration: 'none' }}>Edit</Link>
        <button style={btnDanger} onClick={() => setConfirmDelete(true)}>Delete</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hero */}
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 24, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            {r.profilePhotoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={r.profilePhotoUrl} alt="" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }} />
              : <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800 }}>{(r.fullName || '?').charAt(0).toUpperCase()}</div>}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--fg)' }}>{r.fullName}</div>
              <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>{r.designation || '—'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: av.color, padding: '3px 10px', borderRadius: 99 }}>{av.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: r.resourceType === 'internal' ? '#2D36D9' : '#F58220', background: r.resourceType === 'internal' ? 'rgba(45,54,217,0.1)' : 'rgba(245,130,32,0.12)', padding: '3px 10px', borderRadius: 99 }}>{r.resourceType === 'internal' ? '🏢 Internal' : '🌐 External'}</span>
                {r.experienceYears > 0 && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{r.experienceYears} years experience</span>}
                {r.employeeCode && <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>ID: {r.employeeCode}</span>}
              </div>
            </div>
          </div>

          {/* Quick facts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <Fact label="Location" value={r.location} />
            <Fact label="Time Zone" value={r.timeZone} />
            <Fact label="Current Company" value={r.currentCompany} />
            <Fact label="Notice Period" value={r.noticePeriod} />
            <Fact label="English Level" value={r.englishLevel} />
            <Fact label="Expected Joining" value={r.expectedJoiningDate ? fmtDate(r.expectedJoiningDate) : ''} />
            <Fact label="Primary Tech" value={r.primaryTechnology} />
            <Fact label="Secondary Tech" value={r.secondaryTechnology} />
          </div>

          {emp && (
            <Card title="Linked Employee">
              <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                {emp.name} · {emp.employeeId}{emp.designation ? ` · ${emp.designation}` : ''}
                {emp.email && <span style={{ color: 'var(--fg-4)' }}> · {emp.email}</span>}
              </div>
            </Card>
          )}

          {r.summary && <Card title="Professional Summary"><p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--fg-2)' }}>{r.summary}</p></Card>}

          {(r.skills?.length ?? 0) > 0 && (
            <Card title="Skills">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {r.skills.map(s => <span key={s} style={{ fontSize: 12, fontWeight: 500, padding: '4px 11px', borderRadius: 99, background: 'var(--accent-soft)', color: 'var(--accent)' }}>{s}</span>)}
              </div>
            </Card>
          )}

          {/* Links */}
          {(r.portfolioUrl || r.linkedinUrl || r.githubUrl) && (
            <Card title="Links">
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {r.portfolioUrl && <a href={r.portfolioUrl} target="_blank" rel="noopener noreferrer" style={extLink}>Portfolio ↗</a>}
                {r.linkedinUrl && <a href={r.linkedinUrl} target="_blank" rel="noopener noreferrer" style={extLink}>LinkedIn ↗</a>}
                {r.githubUrl && <a href={r.githubUrl} target="_blank" rel="noopener noreferrer" style={extLink}>GitHub ↗</a>}
              </div>
            </Card>
          )}

          {(r.workExperience?.length ?? 0) > 0 && (
            <Card title="Work Experience">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {r.workExperience.map((w, i) => (
                  <div key={i} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{w.role}{w.company ? ` — ${w.company}` : ''}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>{fmtDate(w.startDate)} — {w.current ? 'Present' : fmtDate(w.endDate)}</div>
                    </div>
                    {w.location && <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>{w.location}</div>}
                    {w.description && <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>{w.description}</div>}
                    {(w.responsibilities ?? []).filter(Boolean).length > 0 && (
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.6 }}>
                        {w.responsibilities.filter(Boolean).map((b, bi) => <li key={bi}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(r.projects?.length ?? 0) > 0 && (
            <Card title="Projects">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {r.projects.map((p, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{p.name}{p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ ...extLink, marginLeft: 8, fontSize: 12 }}>↗</a>}</div>
                      {p.duration && <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>{p.duration}</div>}
                    </div>
                    {p.role && <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{p.role}</div>}
                    {p.description && <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 3 }}>{p.description}</div>}
                    {(p.technologies?.length ?? 0) > 0 && <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 4 }}>Tech: {p.technologies.join(', ')}</div>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(r.education?.length ?? 0) > 0 && (
            <Card title="Education">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {r.education.map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{e.degree}{e.field ? `, ${e.field}` : ''}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{e.institution}{e.grade ? ` · ${e.grade}` : ''}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>{fmtDate(e.startDate)} — {fmtDate(e.endDate)}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(r.certifications?.length ?? 0) > 0 && (
            <Card title="Certifications">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.7 }}>
                {r.certifications.map((c, i) => <li key={i}>{c.name}{c.issuer ? ` — ${c.issuer}` : ''}{c.date ? ` (${c.date})` : ''}</li>)}
              </ul>
            </Card>
          )}

          {r.resumeUrl && (
            <Card title="Resume">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{r.resumeName || 'Resume file'}{r.resumeSize ? ` · ${Math.round(r.resumeSize / 1024)} KB` : ''}</span>
                <button style={btn} onClick={() => openResume(r, 'preview')}>Preview</button>
                <button style={btn} onClick={() => openResume(r, 'download')}>Download</button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {pdfErr && (
        <div style={toastBox} role="alert">
          <span style={{ flex: 1 }}>{pdfErr}</span>
          <button onClick={() => setPdfErr('')} style={toastClose} aria-label="Dismiss">✕</button>
        </div>
      )}

      {confirmDelete && (
        <div style={overlay}>
          <div style={panelSm}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>Delete this resource?</div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20 }}>This permanently removes {r.fullName} and their uploaded files. This cannot be undone.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={btn}>Cancel</button>
              <button onClick={doDelete} style={btnDangerFull}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
function Fact({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--fg)', marginTop: 3 }}>{value || '—'}</div>
    </div>
  );
}

const backLink: React.CSSProperties = { fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none' };
const extLink: React.CSSProperties = { fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 };
const btn: React.CSSProperties = { padding: '7px 13px', fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnDanger: React.CSSProperties = { padding: '7px 13px', fontSize: 12, fontWeight: 500, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnDangerFull: React.CSSProperties = { padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#ef4444', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 };
const panelSm: React.CSSProperties = { background: 'var(--bg-1)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', padding: 24, width: 420, maxWidth: '100%' };
const toastBox: React.CSSProperties = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, maxWidth: 'min(560px, calc(100vw - 32px))', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: '#7f1d1d', color: '#fff', fontSize: 13, fontWeight: 500, borderRadius: 'var(--r-sm)', boxShadow: '0 6px 24px rgba(0,0,0,0.35)' };
const toastClose: React.CSSProperties = { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 22, height: 22, borderRadius: 4, cursor: 'pointer', fontSize: 12, flexShrink: 0 };
