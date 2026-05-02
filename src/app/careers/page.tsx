import type { Metadata } from 'next';
import Script from 'next/script';
import { Eyebrow, SectionHead } from '@/components/Primitives';
import { Reveal } from '@/components/Parallax';
import Icon from '@/components/Icon';
import CareersForm from './CareersForm';

const SITE_URL = process.env.SITE_URL || 'https://steptosoft.com';

export const metadata: Metadata = {
  title: 'Careers — Join the Step To Soft studio',
  description:
    'Six open roles: senior React, Node.js backend, DevOps, QA automation, product designer, bootcamp mentor. In-house, NDA-protected, on payroll. Apply in 60 seconds.',
  alternates: { canonical: '/careers' },
  openGraph: { url: '/careers', title: 'Careers at Step To Soft' },
};

const ROLES = [
  { title: 'Senior React Engineer', dept: 'Engineering', loc: 'Asansol / Remote', type: 'Full-time' },
  { title: 'Node.js Backend Engineer', dept: 'Engineering', loc: 'Asansol / Remote', type: 'Full-time' },
  { title: 'DevOps Engineer (AWS)', dept: 'Infrastructure', loc: 'Asansol / Remote', type: 'Full-time' },
  { title: 'QA Automation Lead', dept: 'Quality', loc: 'Asansol', type: 'Full-time' },
  { title: 'Product Designer', dept: 'Design', loc: 'Remote', type: 'Full-time' },
  { title: 'Bootcamp Mentor (Web Dev)', dept: 'Academy', loc: 'Asansol / Remote', type: 'Part-time' },
];

const jobsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: ROLES.map((r, i) => ({
    '@type': 'JobPosting',
    position: i + 1,
    title: r.title,
    employmentType: r.type === 'Full-time' ? 'FULL_TIME' : 'PART_TIME',
    hiringOrganization: { '@type': 'Organization', name: 'Step To Soft', sameAs: SITE_URL },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: 'Asansol', addressCountry: 'IN' },
    },
    datePosted: new Date().toISOString().slice(0, 10),
    url: `${SITE_URL}/careers#apply`,
  })),
};

export default function CareersPage() {
  return (
    <div className="page-enter">
      <Script
        id="ld-jobs"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobsJsonLd) }}
      />
      <section style={{ paddingTop: 160, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
        <div className="blueprint" />
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '50%',
            height: '60%',
            background: 'radial-gradient(closest-side, var(--accent-glow), transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.5,
          }}
        />
        <div className="container" style={{ position: 'relative' }}>
          <Eyebrow>Careers · Joining the studio</Eyebrow>
          <h1 style={{ marginTop: 24, maxWidth: 1000 }}>
            Build software that real teams ship on. With humans you&apos;d want to grab a chai with.
          </h1>
          <p className="lead" style={{ marginTop: 28 }}>
            We hire engineers, designers, and mentors. In-house, NDA-protected, on payroll. No
            freelancers, no body-shops.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Open roles" title="Six seats. Pick the one." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ROLES.map((r, i) => (
              <Reveal key={r.title} delay={i * 50}>
                <div className="card role-row" style={{ padding: '24px 28px' }}>
                  <div
                    className="mono"
                    style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: '0.14em' }}
                  >
                    R{String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 18, marginBottom: 4 }}>{r.title}</h4>
                    <div
                      className="mono"
                      style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em' }}
                    >
                      {r.dept.toUpperCase()}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      color: 'var(--fg-2)',
                      fontSize: 14,
                    }}
                  >
                    <Icon name="pin" size={14} /> {r.loc}
                  </div>
                  <div>
                    <span className="chip">
                      <span className="chip-dot" />
                      {r.type}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <a
                      href="#apply"
                      className="link-u mono"
                      style={{
                        fontSize: 11,
                        color: 'var(--accent)',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Apply →
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="apply"
        className="section"
        style={{
          background: 'var(--bg-1)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          scrollMarginTop: 100,
        }}
      >
        <div className="container">
          <div className="apply-grid">
            <div>
              <Eyebrow>Apply</Eyebrow>
              <h2 style={{ marginTop: 20 }}>Skip the form. Send us your work.</h2>
              <p className="lead" style={{ marginTop: 24 }}>
                One application form for everything — engineering, design, mentoring, course
                enrollment. We read every submission within 5 business days.
              </p>
              <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {[
                  ['No tech-test gauntlet', 'We pair-program on a real problem from your CV. 60 minutes, paid.'],
                  ['Conversational interview', 'Two rounds. With humans, not a panel.'],
                  ['Decision in 10 days', "You'll hear back inside two weeks of first reply."],
                ].map(([h, b]) => (
                  <div key={h} style={{ display: 'flex', gap: 14 }}>
                    <Icon name="check" size={18} stroke={2} />
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{h}</div>
                      <p style={{ fontSize: 14, color: 'var(--fg-3)' }}>{b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <CareersForm roles={ROLES.map((r) => r.title)} />
          </div>
        </div>
      </section>
    </div>
  );
}
