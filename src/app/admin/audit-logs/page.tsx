'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, AuditLog } from '@/lib/adminApi';

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  CREATE:       { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80' },
  UPDATE:       { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  DELETE:       { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  SOFT_DELETE:  { bg: 'rgba(239,68,68,0.08)',   color: '#fca5a5' },
  BULK_UPDATE:  { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
  EXPORT:       { bg: 'rgba(234,179,8,0.15)',   color: '#facc15' },
  LOGIN:        { bg: 'rgba(34,197,94,0.08)',   color: '#86efac' },
  LOGOUT:       { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
};

function ActionBadge({ action }: { action: string }) {
  const c = ACTION_COLORS[action] ?? { bg: 'var(--bg-2)', color: 'var(--fg-3)' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
      {action}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const RESOURCES = ['application', 'enquiry', 'user', 'course', 'bill', 'auth', 'cache'];
const ACTIONS   = ['CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'BULK_UPDATE', 'EXPORT', 'LOGIN', 'LOGOUT'];

export default function AuditLogsPage() {
  const [items, setItems]       = useState<AuditLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [resource, setResource] = useState('');
  const [action, setAction]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (resource) params.resource = resource;
      if (action)   params.action   = action;
      const data = await adminApi.auditLogs(params);
      setItems(data.data);
      setTotal(data.meta.total);
      setPages(data.meta.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, resource, action]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>
          Audit Logs <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-4)' }}>({total})</span>
        </h1>
        <select value={resource} onChange={e => { setResource(e.target.value); setPage(1); }} style={inputSm}>
          <option value="">All resources</option>
          {RESOURCES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }} style={inputSm}>
          <option value="">All actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => load()} style={btnSecondary}>Refresh</button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>No audit logs found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-1)' }}>
                {['Time', 'Admin', 'Action', 'Resource', 'ID', 'Details', 'IP'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(log => (
                <>
                  <tr
                    key={log._id}
                    onClick={() => setExpanded(expanded === log._id ? null : log._id)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--line)', background: expanded === log._id ? 'var(--accent-soft)' : 'transparent' }}
                  >
                    <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 12, color: 'var(--fg-3)' }}>{fmt(log.createdAt)}</td>
                    <td style={{ ...td, fontSize: 12 }}>{log.adminEmail}</td>
                    <td style={td}><ActionBadge action={log.action} /></td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--fg-3)', textTransform: 'capitalize' }}>{log.resource}</td>
                    <td style={{ ...td, fontSize: 11, color: 'var(--fg-4)', fontFamily: 'monospace' }}>{log.resourceId ? log.resourceId.slice(-8) : '—'}</td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--fg-3)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td style={{ ...td, fontSize: 11, color: 'var(--fg-4)', fontFamily: 'monospace' }}>{log.ip || '—'}</td>
                  </tr>
                  {expanded === log._id && (
                    <tr key={`${log._id}-exp`} style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-1)' }}>
                      <td colSpan={7} style={{ padding: '12px 20px' }}>
                        <pre style={{ margin: 0, fontSize: 12, color: 'var(--fg-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify({ adminId: log.adminId, adminEmail: log.adminEmail, action: log.action, resource: log.resource, resourceId: log.resourceId, details: log.details, ip: log.ip, createdAt: log.createdAt }, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnPage}>Prev</button>
          <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={btnPage}>Next</button>
        </div>
      )}
    </div>
  );
}

const inputSm: React.CSSProperties = { padding: '7px 10px', fontSize: 13, color: 'var(--fg)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none' };
const thStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--fg-4)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' };
const td: React.CSSProperties = { padding: '10px 14px', fontSize: 13, color: 'var(--fg)' };
const btnSecondary: React.CSSProperties = { padding: '7px 12px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnPage: React.CSSProperties = { padding: '5px 12px', fontSize: 12, color: 'var(--fg-3)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
