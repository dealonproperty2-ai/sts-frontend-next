'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { adminApi, AdminResource, ResourceStats, AvailabilityStatus } from '@/lib/adminApi';
import ResourceForm, { AVAILABILITY_OPTIONS } from '@/components/ResourceForm';
import { downloadCandidateProfile, downloadClientSubmission } from '@/lib/resourcePdf';

const availMeta = (s: string) => AVAILABILITY_OPTIONS.find(o => o.value === s) ?? { value: s, label: s, color: '#64748B' };

function authHeaders(): Record<string, string> {
  const t = typeof window !== 'undefined' ? localStorage.getItem('sts-admin-token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Resume files are auth-gated, so fetch as a blob with the bearer token, then
// open (preview) or save (download) the object URL.
async function openResume(r: AdminResource, mode: 'preview' | 'download') {
  if (!r.resumeUrl) return;
  const res = await fetch(r.resumeUrl, { headers: authHeaders() });
  if (!res.ok) { alert('Could not load resume file.'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (mode === 'preview') {
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } else {
    const a = document.createElement('a');
    a.href = url; a.download = r.resumeName || `${r.fullName}-Resume`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
}

type Requirement = { technology: string; skills: string; minExp: string; availability: string; noticeDays: string; location: string };
const BLANK_REQ: Requirement = { technology: '', skills: '', minExp: '', availability: '', noticeDays: '', location: '' };

export default function ResourcesPage() {
  const [stats, setStats] = useState<ResourceStats | null>(null);
  const [items, setItems] = useState<AdminResource[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, matchMode: false, scope: 'all' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'all' | 'internal' | 'external'>('all');
  const [availability, setAvailability] = useState('');
  const [sort, setSort] = useState('recent');
  const [archived, setArchived] = useState(false);
  const [view, setView] = useState<'cards' | 'table'>('cards');

  // requirement match
  const [req, setReq] = useState<Requirement>(BLANK_REQ);
  const [reqOpen, setReqOpen] = useState(false);
  const [activeReq, setActiveReq] = useState<Requirement | null>(null);

  // selection + modals
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminResource | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');

  const loadStats = useCallback(async () => {
    try { const res = await adminApi.resourceStats(); setStats(res.data); } catch { /* non-blocking */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '12', scope, sort };
      if (search) params.search = search;
      if (availability) params.availabilityStatus = availability;
      if (archived) params.archived = 'true';
      if (activeReq) {
        if (activeReq.technology) params.reqTechnology = activeReq.technology;
        if (activeReq.skills) params.reqSkills = activeReq.skills;
        if (activeReq.minExp) params.reqMinExp = activeReq.minExp;
        if (activeReq.availability) params.reqAvailability = activeReq.availability;
        if (activeReq.noticeDays) params.reqNoticeDays = activeReq.noticeDays;
        if (activeReq.location) params.reqLocation = activeReq.location;
      }
      const res = await adminApi.resources(params);
      setItems(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [page, scope, sort, search, availability, archived, activeReq]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { load(); }, [load]);

  // Deep-link from the detail page's "Edit" button: /admin/resources?edit=<id>
  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (!editId) return;
    adminApi.getResource(editId)
      .then(res => { setEditTarget(res.data); setFormOpen(true); })
      .catch(() => {})
      .finally(() => window.history.replaceState(null, '', '/admin/resources'));
  }, []);

  function applyRequirement() {
    const has = Object.values(req).some(v => v.trim());
    setActiveReq(has ? { ...req } : null);
    setPage(1);
  }
  function clearRequirement() { setReq(BLANK_REQ); setActiveReq(null); setPage(1); }

  const allOnPageSelected = items.length > 0 && items.every(i => selected.has(i._id));
  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelectAll() {
    setSelected(prev => {
      const n = new Set(prev);
      if (allOnPageSelected) items.forEach(i => n.delete(i._id));
      else items.forEach(i => n.add(i._id));
      return n;
    });
  }
  const selectedItems = useMemo(() => items.filter(i => selected.has(i._id)), [items, selected]);

  async function refresh() { setFormOpen(false); setEditTarget(null); await Promise.all([load(), loadStats()]); }

  async function updateAvailability(r: AdminResource, status: AvailabilityStatus) {
    try { await adminApi.updateResource(r._id, { availabilityStatus: status }); await refresh(); } catch { /* ignore */ }
  }
  async function archiveResource(r: AdminResource, archive: boolean) {
    try { await adminApi.updateResource(r._id, { archived: archive }); await refresh(); } catch { /* ignore */ }
  }

  async function runBusy(label: string, fn: () => Promise<void>) {
    setBusy(label); setError(''); setToast('');
    try {
      await fn();
    } catch (err) {
      // The button state is always cleared in `finally`; surface the exact error
      // both in the console (for debugging) and as a dismissible toast.
      console.error(`[resources] action "${label}" failed`, err);
      setToast(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      {/* Header */}
      <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--fg)' }}>Active Resource Management</h1>
          <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>Match talent to client requirements — internal first, then external.</div>
        </div>
        <button onClick={() => { setEditTarget(null); setFormOpen(true); }} style={btnPrimary}>+ Add Resource</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Stat cards */}
        <div style={{ padding: '18px 24px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            <StatCard label="Total Resources" value={stats?.total} accent="var(--accent)" />
            <StatCard label="Internal" value={stats?.internal} accent="#2D36D9" sub="Employees" />
            <StatCard label="External" value={stats?.external} accent="#F58220" sub="Freelance" />
            <StatCard label="Available" value={stats?.available} accent="#16A34A" />
            <StatCard label="On Project" value={stats?.onProject} accent="#DC2626" />
            <StatCard label="Reserved" value={stats?.reserved} accent="#2D36D9" />
            <StatCard label="Bench" value={stats ? Math.max(0, stats.total - stats.onProject - stats.archived) : undefined} accent="#7C3AED" sub="Not on project" />
            <StatCard label="Archived" value={stats?.archived} accent="#94A3B8" />
          </div>

          {/* Charts */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
              <Panel title="Availability Distribution">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {AVAILABILITY_OPTIONS.map(o => {
                    const count = stats.byStatus?.[o.value] ?? 0;
                    const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 130, fontSize: 12, color: 'var(--fg-3)' }}>{o.label}</span>
                        <div style={{ flex: 1, height: 8, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: o.color, borderRadius: 99, transition: 'width .4s' }} />
                        </div>
                        <span style={{ width: 34, textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
              <Panel title="Top Skills">
                {(stats.topSkills?.length ?? 0) === 0
                  ? <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>No skills recorded yet.</div>
                  : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {stats.topSkills.map(s => (
                        <span key={s.skill} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 99, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                          {s.skill}<span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, padding: '0 6px', fontSize: 11 }}>{s.count}</span>
                        </span>
                      ))}
                    </div>
                  )}
              </Panel>
            </div>
          )}
        </div>

        {/* Requirement match panel */}
        <div style={{ padding: '18px 24px 0' }}>
          <div style={{ border: `1px solid ${activeReq ? 'var(--accent)' : 'var(--line-strong)'}`, borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <button onClick={() => setReqOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: activeReq ? 'var(--accent-soft)' : 'var(--bg-1)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 15 }}>🎯</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>Client Requirement Matching</span>
              {activeReq && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: '#fff', padding: '2px 8px', borderRadius: 99 }}>Active — sorted by match score</span>}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-4)' }}>{reqOpen ? '▲' : '▼'}</span>
            </button>
            {reqOpen && (
              <div style={{ padding: 16, borderTop: '1px solid var(--line)', background: 'var(--bg-1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <ReqField label="Primary Technology"><input value={req.technology} onChange={e => setReq({ ...req, technology: e.target.value })} placeholder="e.g. React" style={inp} /></ReqField>
                  <ReqField label="Skills (comma-separated)"><input value={req.skills} onChange={e => setReq({ ...req, skills: e.target.value })} placeholder="React, TypeScript…" style={inp} /></ReqField>
                  <ReqField label="Min Experience (yrs)"><input type="number" min="0" value={req.minExp} onChange={e => setReq({ ...req, minExp: e.target.value })} style={inp} /></ReqField>
                  <ReqField label="Availability">
                    <select value={req.availability} onChange={e => setReq({ ...req, availability: e.target.value })} style={inp}>
                      <option value="">Any</option>
                      {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </ReqField>
                  <ReqField label="Max Notice (days)"><input type="number" min="0" value={req.noticeDays} onChange={e => setReq({ ...req, noticeDays: e.target.value })} style={inp} /></ReqField>
                  <ReqField label="Location"><input value={req.location} onChange={e => setReq({ ...req, location: e.target.value })} placeholder="e.g. Remote, Bengaluru" style={inp} /></ReqField>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button onClick={applyRequirement} style={btnPrimary}>Find Matches</button>
                  <button onClick={clearRequirement} style={btnGhost}>Clear</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter toolbar */}
        <div style={{ padding: '16px 24px 0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
            {(['all', 'internal', 'external'] as const).map(s => (
              <button key={s} onClick={() => { setScope(s); setPage(1); }} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer', border: 'none', background: scope === s ? 'var(--accent)' : 'var(--bg-2)', color: scope === s ? '#fff' : 'var(--fg-3)' }}>{s}</button>
            ))}
          </div>
          <input placeholder="Search name, skills, tech…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ ...inp, width: 'auto', minWidth: 220, flex: 1 }} />
          <select value={availability} onChange={e => { setAvailability(e.target.value); setPage(1); }} style={{ ...inp, width: 'auto' }}>
            <option value="">All statuses</option>
            {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} disabled={!!activeReq} style={{ ...inp, width: 'auto', opacity: activeReq ? 0.5 : 1 }}>
            <option value="recent">Recently updated</option>
            <option value="name">Name (A–Z)</option>
            <option value="experience">Experience (high→low)</option>
          </select>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--fg-3)', cursor: 'pointer' }}>
            <input type="checkbox" checked={archived} onChange={e => { setArchived(e.target.checked); setPage(1); }} /> Archived
          </label>
          <div style={{ display: 'flex', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
            {(['cards', 'table'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '7px 12px', fontSize: 12, cursor: 'pointer', border: 'none', background: view === v ? 'var(--accent-soft)' : 'var(--bg-2)', color: view === v ? 'var(--accent)' : 'var(--fg-4)' }}>{v === 'cards' ? '▤ Cards' : '☰ Table'}</button>
            ))}
          </div>
        </div>

        {/* Result meta */}
        <div style={{ padding: '12px 24px 4px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--fg-4)' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} /> Select page
          </label>
          <span>{meta.total} result{meta.total === 1 ? '' : 's'}{activeReq ? ' · matched & ranked' : ''}</span>
        </div>

        {/* Content */}
        <div style={{ padding: '4px 24px 24px' }}>
          {error && <div style={errBox}>{error}</div>}
          {loading ? (
            <SkeletonGrid />
          ) : items.length === 0 ? (
            <EmptyState onAdd={() => { setEditTarget(null); setFormOpen(true); }} matched={!!activeReq} />
          ) : view === 'cards' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {items.map(r => (
                <ResourceCard key={r._id} r={r} selected={selected.has(r._id)} onSelect={() => toggleSelect(r._id)}
                  onEdit={() => { setEditTarget(r); setFormOpen(true); }}
                  onAvailability={updateAvailability} onArchive={archiveResource}
                  busy={busy} setBusy={runBusy} />
              ))}
            </div>
          ) : (
            <ResourceTable items={items} selected={selected} onSelect={toggleSelect}
              onEdit={r => { setEditTarget(r); setFormOpen(true); }} />
          )}
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div style={{ padding: '0 24px 24px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnPage}>Prev</button>
            <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{meta.page} / {meta.pages}</span>
            <button disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)} style={btnPage}>Next</button>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={bulkBar}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{selected.size} selected</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={bulkBtn} disabled={!!busy} onClick={() => runBusy('submission', () => downloadClientSubmission(selectedItems))}>{busy === 'submission' ? '…' : '📄 Client Submission PDF'}</button>
            <button style={bulkBtn} disabled={!!busy} onClick={() => runBusy('zip', () => adminApi.zipResumes([...selected]))}>{busy === 'zip' ? '…' : '🗜 Download ZIP'}</button>
            <button style={bulkBtn} disabled={!!busy} onClick={() => runBusy('csv', () => adminApi.exportResources({ ids: [...selected], format: 'csv' }))}>⬇ CSV</button>
            <button style={bulkBtn} disabled={!!busy} onClick={() => runBusy('xlsx', () => adminApi.exportResources({ ids: [...selected], format: 'excel' }))}>⬇ Excel</button>
            <button style={bulkBtn} disabled={!!busy} onClick={() => setEmailOpen(true)}>✉ Email</button>
            <button style={{ ...bulkBtn, background: 'rgba(255,255,255,0.15)' }} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}

      {formOpen && <ResourceForm target={editTarget} onClose={() => { setFormOpen(false); setEditTarget(null); }} onSaved={refresh} />}
      {emailOpen && <EmailModal ids={[...selected]} count={selected.size} onClose={() => setEmailOpen(false)} />}

      {/* Action error toast — fixed so it's visible even when scrolled */}
      {toast && (
        <div style={toastBox} role="alert">
          <span style={{ flex: 1 }}>{toast}</span>
          <button onClick={() => setToast('')} style={toastClose} aria-label="Dismiss">✕</button>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function StatCard({ label, value, accent, sub }: { label: string; value?: number; accent: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '14px 16px', borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 11, color: 'var(--fg-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--fg)', marginTop: 4, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-2)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function ReqField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-4)' }}>{label}</label>{children}</div>;
}

function scoreColor(score: number) {
  if (score >= 85) return '#16A34A';
  if (score >= 60) return '#2D36D9';
  if (score >= 35) return '#F58220';
  return '#94A3B8';
}

function ResourceCard({ r, selected, onSelect, onEdit, onAvailability, onArchive, busy, setBusy }: {
  r: AdminResource; selected: boolean; onSelect: () => void; onEdit: () => void;
  onAvailability: (r: AdminResource, s: AvailabilityStatus) => void; onArchive: (r: AdminResource, a: boolean) => void;
  busy: string; setBusy: (label: string, fn: () => Promise<void>) => Promise<void>;
}) {
  const av = availMeta(r.availabilityStatus);
  const isArchived = !!r.archivedAt;
  return (
    <div style={{ background: 'var(--bg-1)', border: `1px solid ${selected ? 'var(--accent)' : 'var(--line)'}`, borderRadius: 'var(--r-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', opacity: isArchived ? 0.7 : 1 }}>
      <input type="checkbox" checked={selected} onChange={onSelect} style={{ position: 'absolute', top: 14, right: 14, cursor: 'pointer' }} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {r.profilePhotoUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={r.profilePhotoUrl} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }} />
          : <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>{(r.fullName || '?').charAt(0).toUpperCase()}</div>}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.fullName}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.designation || '—'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: av.color, padding: '2px 8px', borderRadius: 99 }}>{av.label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: r.resourceType === 'internal' ? '#2D36D9' : '#F58220', background: r.resourceType === 'internal' ? 'rgba(45,54,217,0.1)' : 'rgba(245,130,32,0.12)', padding: '2px 8px', borderRadius: 99 }}>{r.resourceType === 'internal' ? '🏢 Internal' : '🌐 External'}</span>
        {r.experienceYears > 0 && <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{r.experienceYears}y exp</span>}
        {r.match && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: '#fff', background: scoreColor(r.match.score), padding: '3px 10px', borderRadius: 99 }}>{r.match.score}%</span>}
      </div>

      {(r.skills?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {r.skills.slice(0, 6).map(s => <span key={s} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 99, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-3)' }}>{s}</span>)}
          {r.skills.length > 6 && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>+{r.skills.length - 6}</span>}
        </div>
      )}

      {r.match && r.match.reasons?.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--fg-4)', lineHeight: 1.5, borderLeft: '2px solid var(--line-strong)', paddingLeft: 8 }}>
          {r.match.reasons.slice(0, 3).join(' · ')}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
        <Link href={`/admin/resources/${r._id}`} style={{ ...cardBtn, textDecoration: 'none' }}>View</Link>
        {r.resumeUrl && <button style={cardBtn} onClick={() => openResume(r, 'preview')}>Preview CV</button>}
        {r.resumeUrl && <button style={cardBtn} onClick={() => openResume(r, 'download')}>CV ⬇</button>}
        <button style={cardBtn} disabled={!!busy} onClick={() => setBusy(`pdf-${r._id}`, () => downloadCandidateProfile(r))}>{busy === `pdf-${r._id}` ? '…' : 'Profile PDF'}</button>
        <button style={cardBtn} onClick={onEdit}>Edit</button>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <select value={r.availabilityStatus} onChange={e => onAvailability(r, e.target.value as AvailabilityStatus)} style={{ ...inp, width: 'auto', flex: 1, fontSize: 12, padding: '5px 8px' }}>
          {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button style={{ ...cardBtn, color: isArchived ? '#16A34A' : 'var(--fg-4)' }} onClick={() => onArchive(r, !isArchived)}>{isArchived ? 'Restore' : 'Archive'}</button>
      </div>
    </div>
  );
}

function ResourceTable({ items, selected, onSelect, onEdit }: {
  items: AdminResource[]; selected: Set<string>; onSelect: (id: string) => void; onEdit: (r: AdminResource) => void;
}) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg-1)' }}>
            {['', 'Name', 'Type', 'Designation', 'Exp', 'Primary', 'Availability', 'Match', ''].map((h, i) => (
              <th key={i} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(r => {
            const av = availMeta(r.availabilityStatus);
            return (
              <tr key={r._id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={td}><input type="checkbox" checked={selected.has(r._id)} onChange={() => onSelect(r._id)} /></td>
                <td style={{ ...td, fontWeight: 600 }}>{r.fullName}</td>
                <td style={td}><span style={{ fontSize: 11, fontWeight: 600, color: r.resourceType === 'internal' ? '#2D36D9' : '#F58220' }}>{r.resourceType}</span></td>
                <td style={{ ...td, color: 'var(--fg-3)' }}>{r.designation || '—'}</td>
                <td style={td}>{r.experienceYears || 0}y</td>
                <td style={{ ...td, color: 'var(--fg-3)' }}>{r.primaryTechnology || '—'}</td>
                <td style={td}><span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: av.color, padding: '2px 8px', borderRadius: 99 }}>{av.label}</span></td>
                <td style={td}>{r.match ? <span style={{ fontWeight: 800, color: scoreColor(r.match.score) }}>{r.match.score}%</span> : '—'}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link href={`/admin/resources/${r._id}`} style={{ ...cardBtn, textDecoration: 'none' }}>View</Link>
                    <button style={cardBtn} onClick={() => onEdit(r)}>Edit</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16, height: 210 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ ...shimmer, width: 52, height: 52, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div style={{ ...shimmer, height: 14, width: '70%', borderRadius: 4 }} />
              <div style={{ ...shimmer, height: 11, width: '50%', borderRadius: 4, marginTop: 8 }} />
            </div>
          </div>
          <div style={{ ...shimmer, height: 10, width: '90%', borderRadius: 4, marginTop: 18 }} />
          <div style={{ ...shimmer, height: 10, width: '80%', borderRadius: 4, marginTop: 10 }} />
          <div style={{ ...shimmer, height: 30, width: '100%', borderRadius: 6, marginTop: 20 }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd, matched }: { onAdd: () => void; matched: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--fg-4)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{matched ? '🔍' : '👥'}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-2)' }}>{matched ? 'No resources matched this requirement' : 'No resources yet'}</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>{matched ? 'Try relaxing the technology, experience, or availability filters.' : 'Add your first internal or external resource to get started.'}</div>
      {!matched && <button onClick={onAdd} style={{ ...btnPrimary, marginTop: 18 }}>+ Add Resource</button>}
    </div>
  );
}

function EmailModal({ ids, count, onClose }: { ids: string[]; count: number; onClose: () => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function send() {
    setError(''); setSending(true);
    try {
      const res = await adminApi.emailResources({ ids, to: to.trim(), subject: subject.trim(), message: message.trim() });
      setResult(`Sent to ${to} · ${res.attached} resume(s) attached.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to send'); }
    finally { setSending(false); }
  }

  return (
    <div style={overlay}>
      <div style={{ ...panelSm }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>Email {count} candidate profile{count === 1 ? '' : 's'}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-4)', marginBottom: 16 }}>Resume files are attached automatically.</div>
        {result ? (
          <>
            <div style={{ padding: '10px 12px', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#16A34A' }}>{result}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}><button onClick={onClose} style={btnPrimary}>Done</button></div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder="Client email *" value={to} onChange={e => setTo(e.target.value)} style={inp} />
            <input placeholder="Subject (optional)" value={subject} onChange={e => setSubject(e.target.value)} style={inp} />
            <textarea placeholder="Message (optional)" value={message} onChange={e => setMessage(e.target.value)} rows={4} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
            {error && <div style={errBox}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={onClose} style={btnGhost}>Cancel</button>
              <button onClick={send} disabled={sending || !to.trim()} style={btnPrimary}>{sending ? 'Sending…' : 'Send'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── styles ─────────────────────────────────────────────────────────────── */
const inp: React.CSSProperties = { padding: '7px 10px', fontSize: 13, color: 'var(--fg)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none', width: '100%', boxSizing: 'border-box' };
const td: React.CSSProperties = { padding: '10px 14px', fontSize: 13, color: 'var(--fg)', whiteSpace: 'nowrap' };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnGhost: React.CSSProperties = { padding: '8px 16px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnPage: React.CSSProperties = { padding: '5px 12px', fontSize: 12, color: 'var(--fg-3)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const cardBtn: React.CSSProperties = { padding: '5px 10px', fontSize: 12, color: 'var(--fg-3)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const errBox: React.CSSProperties = { padding: '9px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#f87171', marginBottom: 12 };
const bulkBar: React.CSSProperties = { position: 'sticky', bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 24px', background: 'var(--accent)', flexWrap: 'wrap' };
const bulkBtn: React.CSSProperties = { padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const toastBox: React.CSSProperties = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, maxWidth: 'min(560px, calc(100vw - 32px))', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: '#7f1d1d', color: '#fff', fontSize: 13, fontWeight: 500, borderRadius: 'var(--r-sm)', boxShadow: '0 6px 24px rgba(0,0,0,0.35)' };
const toastClose: React.CSSProperties = { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 22, height: 22, borderRadius: 4, cursor: 'pointer', fontSize: 12, flexShrink: 0 };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 };
const panelSm: React.CSSProperties = { background: 'var(--bg-1)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', padding: 24, width: 460, maxWidth: '100%' };
const shimmer: React.CSSProperties = { background: 'linear-gradient(90deg, var(--bg-2) 25%, var(--line) 50%, var(--bg-2) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' };
