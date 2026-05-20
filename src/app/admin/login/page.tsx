'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/adminApi';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('sts-admin-token')) {
        router.replace('/admin/dashboard');
      }
    } catch { /* storage blocked in some private-browsing environments */ }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminApi.login(email.trim(), password);
      if (!data.success) throw new Error('Login failed');
      localStorage.setItem('sts-admin-token', data.token);
      localStorage.setItem('sts-admin-user', JSON.stringify(data.user));
      router.replace('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 6 }}>
            Step To Soft
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--fg)' }}>Admin Portal</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="login-email" style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@steptosoft.com"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="login-password" style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '11px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: loading ? 'var(--fg-4)' : 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background var(--t-fast)',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 14,
  color: 'var(--fg)',
  background: 'var(--bg-2)',
  border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)',
  outline: 'none',
  width: '100%',
};
