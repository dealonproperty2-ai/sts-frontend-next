'use client';

import * as React from 'react';
import Icon from '@/components/Icon';
import { CornerTicks } from '@/components/Primitives';
import { TiltCard } from '@/components/Parallax';

interface Props {
  roles: string[];
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function CareersForm({ roles }: Props) {
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    portfolio: '',
    message: '',
  });
  const [status, setStatus] = React.useState<Status>('idle');
  const [errMsg, setErrMsg] = React.useState('');

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrMsg('');
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Submission failed');
      setStatus('sent');
      setForm({ name: '', email: '', phone: '', role: '', portfolio: '', message: '' });
      setTimeout(() => setStatus('idle'), 6000);
    } catch (err) {
      setStatus('error');
      setErrMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <TiltCard max={3}>
      <form onSubmit={submit} className="card ticked" style={{ padding: 32, position: 'relative' }} noValidate>
        <CornerTicks />
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--accent)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          Application form
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="field-label" htmlFor="cf-name">
              Name
            </label>
            <input id="cf-name" className="input" required value={form.name} onChange={update('name')} placeholder="Full name" />
          </div>
          <div>
            <label className="field-label" htmlFor="cf-email">
              Email
            </label>
            <input
              id="cf-email"
              className="input"
              required
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="cf-phone">
              Phone
            </label>
            <input id="cf-phone" className="input" required value={form.phone} onChange={update('phone')} placeholder="+91 …" />
          </div>
          <div>
            <label className="field-label" htmlFor="cf-role">
              Applying for
            </label>
            <select id="cf-role" className="input" value={form.role} onChange={update('role')}>
              <option value="">Choose role / course</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="webdev">Course · Full-Stack Web Dev</option>
              <option value="other">Other / Spontaneous</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="field-label" htmlFor="cf-portfolio">
            Portfolio / GitHub / Resume URL
          </label>
          <input id="cf-portfolio" className="input" value={form.portfolio} onChange={update('portfolio')} placeholder="https://…" />
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="field-label" htmlFor="cf-message">
            Tell us about yourself
          </label>
          <textarea
            id="cf-message"
            className="input"
            value={form.message}
            onChange={update('message')}
            placeholder="A few lines on what you've built and why you want to join."
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ marginTop: 24, width: '100%', justifyContent: 'center' }}
          disabled={status === 'sending'}
        >
          {status === 'sent' ? (
            'Application sent ✓'
          ) : status === 'sending' ? (
            'Sending…'
          ) : (
            <>
              Submit application <Icon name="arrow" size={14} />
            </>
          )}
        </button>
        {status === 'error' && (
          <p className="mono" style={{ marginTop: 12, fontSize: 11, color: '#ff7b7b' }}>
            {errMsg || 'Could not send. Please try again.'}
          </p>
        )}
      </form>
    </TiltCard>
  );
}
