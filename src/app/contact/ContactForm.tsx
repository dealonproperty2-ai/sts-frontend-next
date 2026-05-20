'use client';

import * as React from 'react';
import Icon from '@/components/Icon';
import { CornerTicks } from '@/components/Primitives';
import { TiltCard } from '@/components/Parallax';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function ContactForm() {
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    service: '',
    budget: '',
    message: '',
  });
  const [status, setStatus] = React.useState<Status>('idle');
  const [errMsg, setErrMsg] = React.useState('');
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrMsg('');
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to send');
      setStatus('sent');
      setForm({ name: '', email: '', phone: '', country: '', service: '', budget: '', message: '' });
      timerRef.current = setTimeout(() => setStatus('idle'), 6000);
    } catch (err) {
      setStatus('error');
      setErrMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <TiltCard max={3}>
      <form onSubmit={submit} className="card ticked" style={{ padding: 36, position: 'relative' }} noValidate>
        <CornerTicks />
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--accent)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Brief us
        </div>
        <h3 style={{ marginBottom: 24 }}>Project enquiry</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="field-label" htmlFor="ef-name">
              Your name
            </label>
            <input id="ef-name" className="input" required value={form.name} onChange={upd('name')} placeholder="Full name" />
          </div>
          <div>
            <label className="field-label" htmlFor="ef-email">
              Email
            </label>
            <input
              id="ef-email"
              className="input"
              required
              type="email"
              value={form.email}
              onChange={upd('email')}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="ef-phone">
              Phone
            </label>
            <input id="ef-phone" className="input" value={form.phone} onChange={upd('phone')} placeholder="+91 …" />
          </div>
          <div>
            <label className="field-label" htmlFor="ef-country">
              Country
            </label>
            <input id="ef-country" className="input" value={form.country} onChange={upd('country')} placeholder="India" />
          </div>
          <div>
            <label className="field-label" htmlFor="ef-service">
              Service
            </label>
            <select id="ef-service" className="input" value={form.service} onChange={upd('service')}>
              <option value="">Choose service</option>
              <option>Custom Software Development</option>
              <option>SaaS Product Engineering</option>
              <option>Dedicated Developer Pod</option>
              <option>Testing & QA</option>
              <option>Cloud & Migration</option>
              <option>Maintenance & Support</option>
              <option>Not sure — discovery call</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="ef-budget">
              Budget (USD)
            </label>
            <select id="ef-budget" className="input" value={form.budget} onChange={upd('budget')}>
              <option value="">Choose range</option>
              <option>&lt; $10k</option>
              <option>$10k – $50k</option>
              <option>$50k – $200k</option>
              <option>$200k+</option>
              <option>Retainer / pod</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="field-label" htmlFor="ef-msg">
            Project brief
          </label>
          <textarea
            id="ef-msg"
            className="input"
            required
            value={form.message}
            onChange={upd('message')}
            placeholder="What are you trying to ship? Timeline, constraints, anything we should know."
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ marginTop: 24, width: '100%', justifyContent: 'center' }}
          disabled={status === 'sending'}
        >
          {status === 'sent' ? (
            "Sent ✓ — we'll be in touch"
          ) : status === 'sending' ? (
            'Sending…'
          ) : (
            <>
              Send enquiry <Icon name="arrow" size={14} />
            </>
          )}
        </button>
        {status === 'error' && (
          <p className="mono" style={{ marginTop: 12, fontSize: 11, color: '#ff7b7b', textAlign: 'center' }}>
            {errMsg || 'Could not send. Please try again.'}
          </p>
        )}
        <p
          className="mono"
          style={{
            marginTop: 16,
            fontSize: 10,
            color: 'var(--fg-4)',
            letterSpacing: '0.1em',
            textAlign: 'center',
          }}
        >
          STRICT NDA · ASSURED RESPONSE IN 1 BUSINESS DAY
        </p>
      </form>
    </TiltCard>
  );
}
