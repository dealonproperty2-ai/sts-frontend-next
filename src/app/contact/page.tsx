import type { Metadata } from 'next';
import Script from 'next/script';
import { CornerTicks, Eyebrow, SpecLine } from '@/components/Primitives';
import Icon, { IconName } from '@/components/Icon';
import ContactForm from './ContactForm';

const SITE_URL = process.env.SITE_URL || 'https://steptosoft.com';

export const metadata: Metadata = {
  title: 'Contact Step To Soft — Project enquiries & discovery calls',
  description:
    'Tell us what you want to ship. Assured response in 1 business day, discovery call within a week, scoped proposal in 48 hours after the call.',
  alternates: { canonical: '/contact' },
  openGraph: { url: '/contact', title: 'Contact Step To Soft' },
};

const contactJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  url: `${SITE_URL}/contact`,
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+91-3413556956',
    email: 'info@steptosoft.com',
    contactType: 'sales',
    areaServed: 'Worldwide',
    availableLanguage: ['en', 'hi', 'bn'],
  },
};

interface CardItem {
  icon: IconName;
  label: string;
  value: string;
  sub: string;
}

const CARDS: CardItem[] = [
  { icon: 'mail', label: 'Email', value: 'info@steptosoft.com', sub: 'Mon–Fri · <1d response' },
  { icon: 'phone', label: 'Phone', value: '+91-3413556956', sub: '10:00–19:00 IST' },
  { icon: 'pin', label: 'Studio', value: 'Module-21, Asansol webel IT Park, Asansol-713304, West Bengal, INDIA', sub: 'India · Remote-friendly' },
];

export default function ContactPage() {
  return (
    <div className="page-enter">
      <Script
        id="ld-contact"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <section style={{ paddingTop: 160, paddingBottom: 60, position: 'relative', overflow: 'hidden' }}>
        <div className="blueprint" />
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: '60%',
            height: '60%',
            background: 'radial-gradient(closest-side, var(--accent-glow), transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.4,
          }}
        />
        <div className="container" style={{ position: 'relative' }}>
          <Eyebrow>Contact · Booking Q2 · 2026</Eyebrow>
          <h1 style={{ marginTop: 24, maxWidth: 900 }}>Tell us what you want to ship.</h1>
          <p className="lead" style={{ marginTop: 28 }}>
            Assured response in 1 business day. Discovery call within a week. Scoped proposal in 48
            hours after the call.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {CARDS.map((c) => (
                <div key={c.label} className="card ticked" style={{ padding: 24, position: 'relative' }}>
                  <CornerTicks />
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        border: '1px solid var(--accent-edge)',
                        background: 'var(--accent-soft)',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={c.icon} size={20} />
                    </div>
                    <div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--fg-3)',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {c.label}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>{c.value}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>
                        {c.sub}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="card" style={{ padding: 24, background: 'var(--bg-1)' }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--accent)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: 14,
                  }}
                >
                  Working hours
                </div>
                {[
                  ['Mon–Fri', '10:00 — 19:00 IST'],
                  ['Sat', '10:00 — 14:00 IST'],
                  ['Sun', 'Closed'],
                ].map(([d, h]) => (
                  <SpecLine key={d} label={d} value={h} />
                ))}
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
