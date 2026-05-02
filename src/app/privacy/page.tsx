import type { Metadata } from 'next';
import { Eyebrow } from '@/components/Primitives';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Step To Soft collects, uses, and protects your personal information.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="page-enter">
      <section style={{ paddingTop: 160, paddingBottom: 60, position: 'relative', overflow: 'hidden' }}>
        <div className="blueprint" />
        <div className="container" style={{ position: 'relative', maxWidth: 800 }}>
          <Eyebrow>Legal · Privacy</Eyebrow>
          <h1 style={{ marginTop: 24 }}>Privacy Policy</h1>
          <p className="lead" style={{ marginTop: 24 }}>
            We collect only the information you submit through enquiry and application forms — your
            name, email, phone, and the project / role brief — and use it solely to respond to your
            enquiry and shortlist candidates.
          </p>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 20, color: 'var(--fg-2)' }}>
            <p>
              We do not sell or share your data with third parties. Submissions are stored on our
              MongoDB Atlas instance with TLS-in-transit and at-rest encryption.
            </p>
            <p>
              We retain enquiry data for up to 24 months. To request deletion, email
              {' '}<a href="mailto:hello@steptosoft.com" className="link-u">hello@steptosoft.com</a>.
            </p>
            <p>
              This site uses essential cookies only. We do not run third-party analytics that share
              data outside our servers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
