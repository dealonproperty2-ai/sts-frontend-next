'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/adminApi';

type Step = 'credentials' | '2fa' | 'forgot' | 'reset-sent';

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 14,
  color: 'var(--fg)',
  background: 'var(--bg-2)',
  border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const btnPrimary = (disabled: boolean): React.CSSProperties => ({
  marginTop: 4,
  padding: '11px 20px',
  fontSize: 14,
  fontWeight: 600,
  color: '#fff',
  background: disabled ? 'var(--fg-4)' : 'var(--accent)',
  border: 'none',
  borderRadius: 'var(--r-sm)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  width: '100%',
  transition: 'background var(--t-fast)',
});

function ErrorBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#f87171' }}>
      {msg}
    </div>
  );
}

function SuccessBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#4ade80' }}>
      {msg}
    </div>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('sts-admin-token')) router.replace('/admin/dashboard');
    } catch { /* storage blocked */ }
  }, [router]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminApi.login(email.trim(), password, step === '2fa' ? totp : undefined);
      if (data.requires2FA) {
        setStep('2fa');
        return;
      }
      if (!data.token || !data.user) throw new Error('Login failed');
      localStorage.setItem('sts-admin-token', data.token);
      if (data.refreshToken) localStorage.setItem('sts-admin-refresh', data.refreshToken);
      localStorage.setItem('sts-admin-user', JSON.stringify(data.user));
      router.replace('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminApi.forgotPassword(email.trim());
      setStep('reset-sent');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
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
          {step === '2fa' && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--fg-3)' }}>Enter your 2FA code</p>}
          {step === 'forgot' && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--fg-3)' }}>Password reset</p>}
        </div>

        {/* ── Credentials step ── */}
        {step === 'credentials' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="login-email" style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>Email</label>
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="admin@steptosoft.com" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="login-password" style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>Password</label>
              <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" style={inputStyle} />
            </div>
            <ErrorBox msg={error} />
            <button type="submit" disabled={loading} style={btnPrimary(loading)}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" onClick={() => { setStep('forgot'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
              Forgot password?
            </button>
          </form>
        )}

        {/* ── 2FA step ── */}
        {step === '2fa' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 16px', background: 'var(--accent-soft)', border: '1px solid var(--accent-edge)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--fg-2)' }}>
              Open your authenticator app and enter the 6-digit code for Step To Soft.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="totp-code" style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>Authenticator code</label>
              <input id="totp-code" type="text" inputMode="numeric" pattern="\d{6}" maxLength={8} value={totp} onChange={(e) => setTotp(e.target.value)} required autoComplete="one-time-code" placeholder="000000" style={{ ...inputStyle, fontSize: 24, letterSpacing: '0.2em', textAlign: 'center' }} />
            </div>
            <ErrorBox msg={error} />
            <button type="submit" disabled={loading || totp.length < 6} style={btnPrimary(loading || totp.length < 6)}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" onClick={() => { setStep('credentials'); setTotp(''); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
              ← Back to login
            </button>
          </form>
        )}

        {/* ── Forgot password step ── */}
        {step === 'forgot' && (
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.6 }}>
              Enter your email and we&apos;ll send a reset link if the account exists.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="forgot-email" style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>Email</label>
              <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="admin@steptosoft.com" style={inputStyle} />
            </div>
            <ErrorBox msg={error} />
            <button type="submit" disabled={loading} style={btnPrimary(loading)}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <button type="button" onClick={() => { setStep('credentials'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
              ← Back to login
            </button>
          </form>
        )}

        {/* ── Reset link sent ── */}
        {step === 'reset-sent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>✉️</div>
            <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6 }}>
              If <strong>{email}</strong> is a registered admin email, a reset link has been sent. Check your inbox.
            </p>
            <button type="button" onClick={() => { setStep('credentials'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              Back to login
            </button>
          </div>
        )}

        <SuccessBox msg={success} />
      </div>
    </div>
  );
}
