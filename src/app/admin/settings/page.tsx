'use client';

import { useState, useEffect, FormEvent } from 'react';
import { adminApi, AdminUser } from '@/lib/adminApi';

const inputStyle: React.CSSProperties = {
  padding: '9px 12px', fontSize: 14, color: 'var(--fg)',
  background: 'var(--bg-2)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)', outline: 'none', width: '100%', boxSizing: 'border-box',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 15 }}>{title}</div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

function StatusMsg({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  if (!msg) return null;
  const isErr = type === 'error';
  return (
    <div style={{ padding: '10px 14px', background: isErr ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${isErr ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: 'var(--r-sm)', fontSize: 13, color: isErr ? '#f87171' : '#4ade80', marginTop: 12 }}>
      {msg}
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<AdminUser | null>(null);

  // 2FA setup state
  const [tfaStep, setTfaStep] = useState<'idle' | 'scan' | 'verify' | 'done'>('idle');
  const [tfaSecret, setTfaSecret] = useState('');
  const [tfaUri, setTfaUri] = useState('');
  const [tfaCode, setTfaCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [tfaMsg, setTfaMsg] = useState('');
  const [tfaMsgType, setTfaMsgType] = useState<'success' | 'error'>('success');
  const [tfaLoading, setTfaLoading] = useState(false);

  // Disable 2FA state
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableMsg, setDisableMsg] = useState('');
  const [disableMsgType, setDisableMsgType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sts-admin-user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    adminApi.me().then(r => {
      setUser(r.data);
      localStorage.setItem('sts-admin-user', JSON.stringify(r.data));
    }).catch(() => {});
  }, []);

  async function startSetup() {
    setTfaLoading(true);
    setTfaMsg('');
    try {
      const r = await adminApi.setup2FA();
      setTfaSecret(r.data.secret);
      setTfaUri(r.data.uri);
      setTfaStep('scan');
    } catch (err: unknown) {
      setTfaMsg(err instanceof Error ? err.message : 'Setup failed');
      setTfaMsgType('error');
    } finally {
      setTfaLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setTfaLoading(true);
    setTfaMsg('');
    try {
      const r = await adminApi.verify2FA(tfaCode);
      setBackupCodes(r.backupCodes);
      setTfaStep('done');
      setTfaCode('');
      if (user) {
        const updated = { ...user, twoFactorEnabled: true };
        setUser(updated);
        localStorage.setItem('sts-admin-user', JSON.stringify(updated));
      }
    } catch (err: unknown) {
      setTfaMsg(err instanceof Error ? err.message : 'Verification failed');
      setTfaMsgType('error');
    } finally {
      setTfaLoading(false);
    }
  }

  async function handleDisable(e: FormEvent) {
    e.preventDefault();
    setDisableLoading(true);
    setDisableMsg('');
    try {
      await adminApi.disable2FA(disablePassword, disableCode);
      setDisableMsg('2FA disabled successfully.');
      setDisableMsgType('success');
      setDisablePassword('');
      setDisableCode('');
      if (user) {
        const updated = { ...user, twoFactorEnabled: false };
        setUser(updated);
        localStorage.setItem('sts-admin-user', JSON.stringify(updated));
      }
      setTfaStep('idle');
    } catch (err: unknown) {
      setDisableMsg(err instanceof Error ? err.message : 'Failed to disable 2FA');
      setDisableMsgType('error');
    } finally {
      setDisableLoading(false);
    }
  }

  const qrUrl = tfaUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tfaUri)}`
    : '';

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 640 }}>
      <h1 style={{ margin: '0 0 28px', fontSize: 22, fontWeight: 700 }}>Account Settings</h1>

      {/* Profile info */}
      <Section title="Profile">
        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['Name', user.name || '—'], ['Email', user.email], ['Role', user.role], ['Last login', user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-IN') : 'N/A']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', gap: 12, fontSize: 14 }}>
                <span style={{ color: 'var(--fg-4)', minWidth: 90 }}>{l}</span>
                <span style={{ color: 'var(--fg-2)' }}>{v}</span>
              </div>
            ))}
          </div>
        ) : <span style={{ color: 'var(--fg-4)', fontSize: 14 }}>Loading…</span>}
      </Section>

      {/* 2FA */}
      <Section title="Two-Factor Authentication (2FA)">
        {!user?.twoFactorEnabled ? (
          <>
            <p style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 0, lineHeight: 1.6 }}>
              Add an extra layer of security to your account. You'll need an authenticator app like Google Authenticator or Authy.
            </p>

            {tfaStep === 'idle' && (
              <button onClick={startSetup} disabled={tfaLoading} style={btnPrimary}>
                {tfaLoading ? 'Starting…' : 'Enable 2FA'}
              </button>
            )}

            {tfaStep === 'scan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>
                  Scan the QR code with your authenticator app, or enter the key manually.
                </p>
                {qrUrl && (
                  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl} alt="QR code for 2FA setup" width={180} height={180} style={{ borderRadius: 8, border: '1px solid var(--line)' }} />
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--fg-4)', marginBottom: 6 }}>Manual key</div>
                      <code style={{ fontSize: 13, background: 'var(--bg-2)', padding: '6px 10px', borderRadius: 6, letterSpacing: '0.08em', wordBreak: 'break-all' }}>{tfaSecret}</code>
                    </div>
                  </div>
                )}
                <button onClick={() => setTfaStep('verify')} style={btnPrimary}>I've scanned it →</button>
              </div>
            )}

            {tfaStep === 'verify' && (
              <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 280 }}>
                <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>Enter the 6-digit code from your authenticator app to confirm setup.</p>
                <input
                  type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                  value={tfaCode} onChange={e => setTfaCode(e.target.value)}
                  required autoComplete="one-time-code" placeholder="000000"
                  style={{ ...inputStyle, fontSize: 24, letterSpacing: '0.3em', textAlign: 'center' }}
                />
                <button type="submit" disabled={tfaLoading || tfaCode.length < 6} style={btnPrimary}>
                  {tfaLoading ? 'Verifying…' : 'Verify & Enable'}
                </button>
              </form>
            )}

            {tfaStep === 'done' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r-sm)', fontSize: 14, color: '#4ade80', fontWeight: 600 }}>
                  ✓ 2FA is now enabled!
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 8 }}>
                    Save these backup codes — each can only be used once if you lose access to your authenticator:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {backupCodes.map(c => (
                      <code key={c} style={{ fontSize: 13, background: 'var(--bg-2)', padding: '6px 10px', borderRadius: 6, fontFamily: 'monospace', letterSpacing: '0.1em' }}>{c}</code>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <StatusMsg msg={tfaMsg} type={tfaMsgType} />
          </>
        ) : (
          <>
            <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r-sm)', fontSize: 14, color: '#4ade80', fontWeight: 600, marginBottom: 20 }}>
              ✓ 2FA is enabled on your account
            </div>
            <p style={{ fontSize: 14, color: 'var(--fg-3)', margin: '0 0 16px' }}>To disable 2FA, enter your password and a valid authenticator code or backup code.</p>
            <form onSubmit={handleDisable} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>Current password</label>
                <input type="password" value={disablePassword} onChange={e => setDisablePassword(e.target.value)} required autoComplete="current-password" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>Authenticator / backup code</label>
                <input type="text" value={disableCode} onChange={e => setDisableCode(e.target.value)} required placeholder="000000 or XXXXXXXX" style={inputStyle} />
              </div>
              <button type="submit" disabled={disableLoading} style={{ ...btnPrimary, background: '#ef4444' }}>
                {disableLoading ? 'Disabling…' : 'Disable 2FA'}
              </button>
            </form>
            <StatusMsg msg={disableMsg} type={disableMsgType} />
          </>
        )}
      </Section>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: '9px 20px', fontSize: 14, fontWeight: 600, color: '#fff',
  background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
  display: 'inline-block',
};
