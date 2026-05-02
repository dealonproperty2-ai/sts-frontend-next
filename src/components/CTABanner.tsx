import Link from 'next/link';
import Icon from './Icon';
import { CornerTicks, Eyebrow } from './Primitives';
import { Reveal } from './Parallax';

export default function CTABanner() {
  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <div
            className="card ticked"
            style={{
              padding: 'clamp(40px, 6vw, 80px)',
              textAlign: 'center',
              background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2))',
              border: '1px solid var(--accent-edge)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CornerTicks />
            <div className="blueprint-fine" style={{ opacity: 0.4 }} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 0%, var(--accent-glow), transparent 60%)',
                filter: 'blur(60px)',
                opacity: 0.3,
              }}
            />
            <div style={{ position: 'relative' }}>
              <Eyebrow>Booking Q2 · 2026</Eyebrow>
              <h2 style={{ marginTop: 24 }}>One discovery call. Scoped proposal in 48h.</h2>
              <p className="lead" style={{ margin: '24px auto 0', textAlign: 'center' }}>
                Tell us what you want to ship. We&apos;ll come back with a fixed-price plan or a pod
                proposal — no obligation.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  marginTop: 36,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Link href="/contact" className="btn btn-primary">
                  Book now <Icon name="arrow" size={14} />
                </Link>
                <Link href="/about" className="btn btn-ghost">
                  Meet the team
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
