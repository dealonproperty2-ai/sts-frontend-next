'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';

const adminLayoutStyle = `
  .admin-shell { display: flex; height: 100vh; overflow: hidden; background: var(--bg); }
  .admin-sidebar {
    width: 220px; flex-shrink: 0; display: flex; flex-direction: column;
    background: var(--bg-1); border-right: 1px solid var(--line); overflow: hidden;
    transition: transform var(--t-med);
  }
  .admin-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .admin-signout:hover { border-color: var(--accent) !important; color: var(--fg) !important; }
  @media (max-width: 768px) {
    .admin-sidebar { position: fixed; inset: 0 auto 0 0; z-index: 300; transform: translateX(-100%); }
    .admin-sidebar.open { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.4); }
    .admin-topbar { display: flex !important; }
  }
`;

const NAV = [
  { href: '/admin/dashboard',            label: 'Dashboard',           icon: '⊞', group: '' },
  { href: '/admin/applications',         label: 'Applications',        icon: '◎', group: '' },
  { href: '/admin/enquiries',            label: 'Enquiries',           icon: '◈', group: '' },
  { href: '/admin/courses',              label: 'Courses',             icon: '◧', group: '' },
  { href: '/admin/users',               label: 'Users',               icon: '◉', group: '' },
  { href: '/admin/bills',               label: 'Office Bills',        icon: '◑', group: '' },
  { href: '/admin/employees',            label: 'Employees',           icon: '◍', group: 'HR' },
  { href: '/admin/payslips',            label: 'Payslips',            icon: '◰', group: 'HR' },
  { href: '/admin/appointment-letters', label: 'Appt. Letters',       icon: '◱', group: 'HR' },
  { href: '/admin/audit-logs',           label: 'Audit Logs',          icon: '◐', group: '' },
  { href: '/admin/settings',            label: 'Settings',            icon: '◫', group: '' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = pathname === '/admin/login';
  const isPublicAdminPage = isLoginPage || pathname === '/admin/reset-password';

  useEffect(() => {
    const token = localStorage.getItem('sts-admin-token');
    if (!token && !isPublicAdminPage) {
      router.replace('/admin/login');
      return;
    }
    if (token) {
      try {
        const raw = localStorage.getItem('sts-admin-user');
        if (raw) setUser(JSON.parse(raw));
      } catch {
        // ignore malformed cache
      }
    }
    setReady(true);
  }, [isPublicAdminPage, router]);

  async function signOut() {
    try {
      await adminApi.logout();
    } catch {
      // best-effort; clear local state regardless
    }
    localStorage.removeItem('sts-admin-token');
    localStorage.removeItem('sts-admin-refresh');
    localStorage.removeItem('sts-admin-user');
    router.replace('/admin/login');
  }

  if (!ready) {
    return (
      <>
        <style>{adminLayoutStyle}</style>
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--fg-3)', fontSize: 14 }}>Loading…</span>
        </div>
      </>
    );
  }

  if (isPublicAdminPage) {
    return (
      <>
        <style>{adminLayoutStyle}</style>
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', overflow: 'auto' }}>
          {children}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{adminLayoutStyle}</style>
      <div className="admin-shell" style={{ position: 'fixed', inset: 0 }}>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 299 }}
          />
        )}

        {/* Sidebar */}
        <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
          {/* Logo */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo3.png" alt="Step To Soft" style={{ height: 32, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--accent)', textTransform: 'uppercase', lineHeight: 1.2 }}>
                STS Admin
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 1 }}>Step To Soft</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
            {(() => {
              const items: React.ReactNode[] = [];
              let lastGroup = '';
              NAV.forEach(({ href, label, icon, group }) => {
                if (group && group !== lastGroup) {
                  items.push(
                    <div key={`grp-${group}`} style={{ padding: '10px 20px 4px', fontSize: 10, fontWeight: 700, color: 'var(--fg-4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {group}
                    </div>
                  );
                  lastGroup = group;
                } else if (!group && lastGroup) {
                  lastGroup = '';
                }
                const active = pathname === href || (pathname.startsWith(href + '/') && href !== '/admin');
                items.push(
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 20px',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active ? 'var(--fg)' : 'var(--fg-3)',
                      textDecoration: 'none',
                      background: active ? 'var(--accent-soft)' : 'transparent',
                      borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                      transition: 'all var(--t-fast)',
                    }}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
                    {label}
                  </Link>
                );
              });
              return items;
            })()}
          </nav>

          {/* User footer */}
          <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--line)' }}>
            {user && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name || 'Admin'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
            )}
            <button onClick={signOut} className="admin-signout" style={{
              width: '100%', padding: '7px 12px', fontSize: 12, fontWeight: 500,
              color: 'var(--fg-3)', background: 'transparent', border: '1px solid var(--line)',
              borderRadius: 'var(--r-sm)', cursor: 'pointer', textAlign: 'left', transition: 'all var(--t-fast)',
            }}>
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="admin-main">
          {/* Mobile top bar */}
          <div className="admin-topbar" style={{ display: 'none', padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bg-1)', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}
            >
              ☰
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo3.png" alt="Step To Soft" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>STS Admin</span>
          </div>
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
