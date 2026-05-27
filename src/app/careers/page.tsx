import type { Metadata } from 'next';
import { Eyebrow, SectionHead } from '@/components/Primitives';
import { Reveal } from '@/components/Parallax';
import Icon from '@/components/Icon';
import { Breadcrumb } from '@/components/Breadcrumb';
import CareersForm from './CareersForm';
import { SITE, BASE_KEYWORDS, buildFAQSchema, buildBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Careers at Step To Soft — React.js, Node.js & Software Engineering Jobs India',
  description:
    'Join Step To Soft — a 25-engineer software development company in Asansol, India. Open roles in React.js, Node.js, DevOps, QA automation, UI/UX design, and web development bootcamp mentoring. In-house, NDA-protected, on payroll.',
  keywords: [
    ...BASE_KEYWORDS,
    'software developer jobs India',
    'React.js developer jobs India',
    'Node.js developer jobs India',
    'software engineering jobs Asansol',
    'IT jobs West Bengal',
    'DevOps engineer jobs India',
    'QA automation jobs India',
    'UI/UX designer jobs India',
    'web developer jobs India',
    'software company jobs India',
    'coding jobs Asansol',
    'full stack developer jobs India',
  ],
  alternates: { canonical: '/careers' },
  openGraph: {
    url: '/careers',
    type: 'website',
    title: 'Careers at Step To Soft — React.js, Node.js & Software Engineering Jobs India',
    description:
      'Open roles: React.js, Node.js, DevOps, QA automation, UI/UX design & bootcamp mentoring. In-house, NDA-protected, on payroll at a growing India software studio.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Careers at Step To Soft — React.js, Node.js & Software Engineering Jobs India',
    description:
      'Open roles: React.js, Node.js, DevOps, QA automation, UI/UX design & bootcamp mentoring. In-house, NDA-protected, on payroll.',
  },
};

const ROLES = [
  {
    title: 'Senior React Engineer',
    dept: 'Engineering',
    loc: 'Asansol / Remote',
    type: 'Full-time',
    description: 'Build performant React.js and Next.js frontends for client products. 4+ years React experience required.',
    baseSalaryMin: 800000,
    baseSalaryMax: 1600000,
  },
  {
    title: 'Node.js Backend Engineer',
    dept: 'Engineering',
    loc: 'Asansol / Remote',
    type: 'Full-time',
    description: 'Design and ship production Node.js APIs and microservices. PostgreSQL and MongoDB experience a plus.',
    baseSalaryMin: 700000,
    baseSalaryMax: 1400000,
  },
  {
    title: 'DevOps Engineer (AWS)',
    dept: 'Infrastructure',
    loc: 'Asansol / Remote',
    type: 'Full-time',
    description: 'Own CI/CD pipelines, AWS infrastructure, and Terraform IaC for client deployments.',
    baseSalaryMin: 900000,
    baseSalaryMax: 1800000,
  },
  {
    title: 'QA Automation Lead',
    dept: 'Quality',
    loc: 'Asansol',
    type: 'Full-time',
    description: 'Lead QA strategy and build Playwright/Cypress automation suites for our client portfolio.',
    baseSalaryMin: 700000,
    baseSalaryMax: 1300000,
  },
  {
    title: 'Product Designer',
    dept: 'Design',
    loc: 'Remote',
    type: 'Full-time',
    description: 'Own end-to-end UI/UX design for web and mobile products — from user research to Figma handoff.',
    baseSalaryMin: 600000,
    baseSalaryMax: 1200000,
  },
  {
    title: 'Bootcamp Mentor (Web Dev)',
    dept: 'Academy',
    loc: 'Asansol / Remote',
    type: 'Part-time',
    description: 'Mentor cohort students weekly in the Step To Soft Academy full-stack web development bootcamp.',
    baseSalaryMin: 300000,
    baseSalaryMax: 600000,
  },
];

const jobsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Open Positions at Step To Soft',
  itemListElement: ROLES.map((r, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'JobPosting',
      '@id': `${SITE.url}/careers#role-${i + 1}`,
      title: r.title,
      description: r.description,
      employmentType: r.type === 'Full-time' ? 'FULL_TIME' : 'PART_TIME',
      hiringOrganization: {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: 'Step To Soft',
        sameAs: SITE.url,
        logo: `${SITE.url}/logo3.png`,
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          streetAddress: SITE.address.street,
          addressLocality: SITE.address.city,
          addressRegion: SITE.address.region,
          postalCode: SITE.address.postalCode,
          addressCountry: SITE.address.country,
        },
      },
      jobLocationType: r.loc.includes('Remote') ? 'TELECOMMUTE' : undefined,
      applicantLocationRequirements: {
        '@type': 'Country',
        name: 'India',
      },
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'INR',
        value: {
          '@type': 'QuantitativeValue',
          minValue: r.baseSalaryMin,
          maxValue: r.baseSalaryMax,
          unitText: 'YEAR',
        },
      },
      datePosted: '2026-05-01',
      validThrough: '2026-12-31',
      url: `${SITE.url}/careers#apply`,
      directApply: true,
    },
  })),
};

const careersFaqJsonLd = buildFAQSchema([
  {
    q: 'What roles are currently open at Step To Soft?',
    a: 'Step To Soft is currently hiring for Senior React Engineer, Node.js Backend Engineer, DevOps Engineer (AWS), QA Automation Lead, Product Designer, and Bootcamp Mentor (Web Dev). All roles are in-house, on payroll, and NDA-protected.',
  },
  {
    q: 'Does Step To Soft hire remote software developers?',
    a: 'Yes. Several roles at Step To Soft are available as Asansol / Remote or fully remote. Roles like Product Designer are fully remote. Engineering roles may require occasional in-person collaboration at our Asansol studio.',
  },
  {
    q: 'What is the hiring process at Step To Soft?',
    a: 'Our process is: (1) Application review within 5 business days, (2) A 60-minute pair programming session on a real problem from your CV — paid, (3) Two conversational rounds with humans, not a panel, (4) Decision within 10 days of first reply.',
  },
  {
    q: 'What is the salary range for software developers at Step To Soft?',
    a: 'Salary depends on role, experience, and engagement type. Our software engineering roles range from ₹7L to ₹18L per annum. We offer competitive salaries, performance bonuses, and a clear career path.',
  },
  {
    q: 'Can I apply to the Step To Soft Academy bootcamp from the careers page?',
    a: 'Yes. The same application form handles both job applications and course enrollment. Select your role of interest — including "Bootcamp Student" — and our team will route your application to the right person.',
  },
]);

const breadcrumbJsonLd = buildBreadcrumbSchema([
  { name: 'Home', url: SITE.url },
  { name: 'Careers', url: `${SITE.url}/careers` },
]);

export default function CareersPage() {
  return (
    <div className="page-enter">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobsJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(careersFaqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

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
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Careers' }]} />
          <Eyebrow>Careers · Joining the studio</Eyebrow>
          <h1 style={{ marginTop: 24, maxWidth: 1000 }}>
            React.js, Node.js & Software Engineering Jobs in India — Join the Step To Soft Studio.
          </h1>
          <p className="lead" style={{ marginTop: 28 }}>
            We hire React.js engineers, Node.js backend developers, DevOps engineers, QA leads, product designers, and bootcamp mentors.
            In-house, NDA-protected, on payroll. No freelancers, no body-shops.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Open roles" title="Six seats. Pick the one." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ROLES.map((r, i) => (
              <Reveal key={r.title} delay={i * 50}>
                <div className="card role-row" style={{ padding: '24px 28px' }} id={`role-${i + 1}`}>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: '0.14em' }}>
                    R{String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, marginBottom: 4 }}>{r.title}</h2>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>
                      {r.dept.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--fg-2)', fontSize: 14 }}>
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
                      style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase' }}
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
