'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, StatsData, Application, Enquiry } from '@/lib/adminApi';

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div style={{
      padding: '20px 24px',
      background: 'var(--bg-1)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-md)',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function statusBadge(status: string) {
  const colors: Record<string, { bg: string; color: string }> = {
    new: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    open: { bg: 'rgba(234,179,8,0.15)', color: '#facc15' },
    reviewed: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
    shortlisted: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
    hired: { bg: 'rgba(34,197,94,0.25)', color: '#22c55e' },
    rejected: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    closed: { bg: 'rgba(107,114,128,0.2)', color: '#9ca3af' },
  };
  const c = colors[status] ?? { bg: 'var(--bg-2)', color: 'var(--fg-3)' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentApps, setRecentApps] = useState<Application[]>([]);
  const [recentEnqs, setRecentEnqs] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      adminApi.stats(),
      adminApi.applications({ limit: '5', page: '1' }),
      adminApi.enquiries({ limit: '5', page: '1' }),
    ])
      .then(([s, apps, enqs]) => {
        setStats(s.data);
        setRecentApps(apps.data);
        setRecentEnqs(enqs.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageShell><Loading /></PageShell>;
  if (error) return <PageShell><ErrorMsg msg={error} /></PageShell>;

  return (
    <PageShell>
      <h1 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 600, color: 'var(--fg)' }}>Dashboard</h1>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Applications" value={stats!.applications.total} sub={`${stats!.applications.new ?? 0} new`} />
        <StatCard label="Total Enquiries" value={stats!.enquiries.total} sub={`${stats!.enquiries.new ?? 0} new`} />
        <StatCard label="Total Users" value={stats!.users.total} />
        <StatCard label="Shortlisted" value={stats!.applications.shortlisted ?? 0} />
        <StatCard label="Hired" value={stats!.applications.hired ?? 0} />
        <StatCard label="Open Enquiries" value={stats!.enquiries.open ?? 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent Applications */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg-2)' }}>Recent Applications</h2>
            <Link href="/admin/applications" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all</Link>
          </div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {recentApps.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>No applications yet</div>
            ) : recentApps.map((a, i) => (
              <div key={a._id} style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{a.role}</div>
                </div>
                {statusBadge(a.status)}
              </div>
            ))}
          </div>
        </section>

        {/* Recent Enquiries */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg-2)' }}>Recent Enquiries</h2>
            <Link href="/admin/enquiries" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all</Link>
          </div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {recentEnqs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>No enquiries yet</div>
            ) : recentEnqs.map((e, i) => (
              <div key={e._id} style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{e.service ?? e.email}</div>
                </div>
                {statusBadge(e.status)}
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      {children}
    </div>
  );
}

function Loading() {
  return <div style={{ color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>;
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', color: '#f87171', fontSize: 13 }}>
      {msg}
    </div>
  );
}
