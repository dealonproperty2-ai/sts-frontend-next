import type { Metadata } from 'next';
import { Eyebrow } from '@/components/Primitives';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms governing your use of the Step To Soft website and academy materials.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
  openGraph: {
    url: '/terms',
    type: 'website',
    title: 'Terms of Use — Step To Soft',
    description: 'Terms governing your use of the Step To Soft website and academy materials.',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Use — Step To Soft',
    description: 'Terms governing your use of the Step To Soft website and academy materials.',
  },
};

export default function TermsPage() {
  return (
    <div className="page-enter">
      <section style={{ paddingTop: 160, paddingBottom: 60, position: 'relative', overflow: 'hidden' }}>
        <div className="blueprint" />
        <div className="container" style={{ position: 'relative', maxWidth: 800 }}>
          <Eyebrow>Legal · Terms</Eyebrow>
          <h1 style={{ marginTop: 24 }}>Terms of Use</h1>
          <p className="lead" style={{ marginTop: 24 }}>
            By using this site, you agree to use it lawfully and not to scrape, reverse-engineer, or
            misuse our services. All content (text, design, course curricula) is © Step To Soft Pvt.
            Ltd. unless otherwise noted.
          </p>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 20, color: 'var(--fg-2)' }}>
            <p>
              Engagements are governed by signed Master Services Agreements; nothing on this site
              constitutes an offer or binding commitment.
            </p>
            <p>
              Course enrollments are subject to a separate enrollment agreement provided after your
              application is accepted.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
