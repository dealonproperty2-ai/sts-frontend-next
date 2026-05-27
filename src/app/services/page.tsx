import type { Metadata } from 'next';
import Link from 'next/link';
import Icon, { IconName } from '@/components/Icon';
import { CornerTicks, Eyebrow, SpecLine } from '@/components/Primitives';
import { Reveal, ScrollFloat } from '@/components/Parallax';
import { Breadcrumb } from '@/components/Breadcrumb';
import CTABanner from '@/components/CTABanner';
import {
  SITE,
  BASE_KEYWORDS,
  SERVICE_KEYWORDS,
  buildFAQSchema,
  buildBreadcrumbSchema,
} from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Software Development Services — Custom, MERN Stack, React.js, Node.js & More',
  description:
    'Explore Step To Soft\'s software development services: custom software, MERN stack, React.js, Node.js, mobile app development, UI/UX design, SaaS engineering, cloud migration, dedicated developer teams & QA. Trusted by clients in 18+ countries.',
  keywords: [
    ...BASE_KEYWORDS,
    ...SERVICE_KEYWORDS,
    'MERN stack development services India',
    'React.js development services',
    'Node.js development services',
    'custom software development services India',
    'mobile app development services India',
    'UI/UX design services India',
    'digital transformation services India',
    'SaaS product development company',
    'cloud migration services India',
    'software QA testing company India',
    'dedicated developer team India',
    'software maintenance and support',
  ],
  alternates: { canonical: '/services' },
  openGraph: {
    url: '/services',
    type: 'website',
    title: 'Software Development Services — MERN Stack, React.js, Node.js & More | Step To Soft',
    description:
      'Custom software, MERN stack, React.js & Node.js development, mobile apps, UI/UX design, cloud migration, QA & dedicated developer pods. Serving 18+ countries.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Software Development Services — MERN Stack, React.js, Node.js & More | Step To Soft',
    description:
      'Custom software, MERN stack, React.js & Node.js development, mobile apps, UI/UX design, cloud migration, QA & dedicated developer pods.',
  },
};

interface ServiceDef {
  icon: IconName;
  tag: string;
  title: string;
  body: string;
  deliverables: string[];
  stack: string[];
  keywords: string[];
}

const DETAIL_SERVICES: ServiceDef[] = [
  {
    icon: 'code',
    tag: '01',
    title: 'Custom Software Development',
    body: "When off-the-shelf can't do it, we build it. From internal tools that save your ops team 20 hours a week to customer-facing platforms that scale to millions. We deliver custom software solutions for startups, SMBs, and enterprise clients worldwide.",
    deliverables: ['Discovery & spec', 'Architecture doc', 'CI/CD pipeline', 'Production deploys', 'Handover or ongoing support'],
    stack: ['Node.js', 'Python', '.NET', 'Postgres', 'Redis', 'AWS', 'Docker'],
    keywords: ['custom software development', 'bespoke software', 'enterprise software'],
  },
  {
    icon: 'layers',
    tag: '02',
    title: 'SaaS Product Engineering',
    body: 'Take an idea from PRD to paying customers. We handle the full SaaS stack — multi-tenancy, billing, auth, observability, the lot. Our MERN stack and React.js expertise ensures fast, scalable SaaS product delivery.',
    deliverables: ['MVP in 8 weeks', 'Multi-tenant architecture', 'Stripe billing', 'Auth + RBAC', 'Observability stack'],
    stack: ['Next.js', 'React.js', 'Node.js', 'tRPC', 'Postgres', 'Stripe', 'Vercel'],
    keywords: ['SaaS product development', 'software product engineering', 'MVP development'],
  },
  {
    icon: 'users',
    tag: '03',
    title: 'Dedicated Developer Pods',
    body: 'A self-driving pod (PM + engineers + QA) that operates as your team. We hire, manage, and replace — you get the velocity. Our dedicated React.js, Node.js, and MERN stack developers integrate directly into your workflow.',
    deliverables: ['Onboard in 2 weeks', 'Daily standup with you', 'Linear/Jira on your tools', 'Code in your repos', 'Monthly retro'],
    stack: ['Any stack you run', 'Your CI/CD', 'Your repos', 'Your tools'],
    keywords: ['dedicated developer team', 'dedicated software developers', 'staff augmentation'],
  },
  {
    icon: 'shield',
    tag: '04',
    title: 'Testing & QA',
    body: "Manual + automated test suites that catch what your team won't. Performance, security, regression — modern frameworks, full reporting. We ensure your software meets the highest quality standards before and after launch.",
    deliverables: ['Test strategy', 'E2E suites (Playwright/Cypress)', 'Load tests (k6/JMeter)', 'Security audits', 'CI gates'],
    stack: ['Playwright', 'Cypress', 'k6', 'Jest', 'Burp', 'OWASP ZAP'],
    keywords: ['software QA testing', 'automated testing services', 'quality assurance'],
  },
  {
    icon: 'cloud',
    tag: '05',
    title: 'Cloud & Migration',
    body: 'Modernize legacy stacks. Move to AWS/GCP/Azure. Cut ops cost, increase deploy frequency, and stop worrying about Friday outages. We handle the full cloud migration lifecycle from assessment to go-live.',
    deliverables: ['Cloud assessment', 'Migration plan', 'IaC (Terraform)', 'Zero-downtime cutover', 'Cost optimisation'],
    stack: ['AWS', 'GCP', 'Azure', 'Terraform', 'Kubernetes', 'Cloudflare'],
    keywords: ['cloud migration services', 'AWS migration', 'cloud infrastructure'],
  },
  {
    icon: 'wrench',
    tag: '06',
    title: 'Maintenance & Support',
    body: "We run software once it's shipped. Proactive monitoring, bug triage, perf tuning, and steady feature drops — like a tiny product team you rent. Ideal for teams that want reliable software operations without full-time hires.",
    deliverables: ['24/5 monitoring', 'Bug SLA', 'Monthly perf review', 'Dependency upgrades', 'Roadmap delivery'],
    stack: ['Datadog', 'PagerDuty', 'Sentry', 'GitHub Actions', 'Linear'],
    keywords: ['software maintenance', 'technical support services', 'managed IT services'],
  },
];

const servicesJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Step To Soft Software Development Services',
  description: 'Comprehensive software development services including custom software, MERN stack, React.js, Node.js, mobile app development, and more.',
  itemListElement: DETAIL_SERVICES.map((s, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Service',
      '@id': `${SITE.url}/services#${s.tag}`,
      name: s.title,
      description: s.body,
      provider: {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: 'Step To Soft',
        url: SITE.url,
      },
      areaServed: 'Worldwide',
      serviceType: s.title,
      keywords: s.keywords.join(', '),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE.url}/contact`,
      },
    },
  })),
};

const servicesFaqJsonLd = buildFAQSchema([
  {
    q: 'What custom software development services does Step To Soft provide?',
    a: 'Step To Soft provides end-to-end custom software development including requirements gathering, architecture design, frontend (React.js, Next.js), backend (Node.js, Python, .NET), database design (PostgreSQL, MongoDB), API development, cloud deployment, and ongoing maintenance. We build web apps, SaaS platforms, enterprise tools, and mobile apps.',
  },
  {
    q: 'Do you specialise in MERN stack development?',
    a: 'Yes. MERN stack (MongoDB, Express.js, React.js, Node.js) is one of our primary technology stacks. Our MERN stack developers have shipped 120+ applications ranging from MVPs to enterprise-scale platforms. We can build your full-stack web application from scratch or augment your existing MERN team.',
  },
  {
    q: 'Can I hire dedicated React.js or Node.js developers from Step To Soft?',
    a: 'Yes. You can hire dedicated React.js frontend developers, Node.js backend developers, or a full MERN stack pod. Our dedicated developer pods include a project manager, engineers, and QA — all in-house, NDA-protected, and onboarded within two weeks.',
  },
  {
    q: 'What is the cost of hiring a software development team from Step To Soft?',
    a: 'Pricing varies by team size and engagement type. We offer fixed-price quotes for well-defined projects and monthly retainers for dedicated pods. Contact us for a free discovery call and we will send a detailed proposal within 48 hours.',
  },
  {
    q: 'Do you provide UI/UX design services alongside development?',
    a: 'Yes. Our product designers handle the full UX/UI design process — user research, wireframing, prototyping, design systems, and handoff to engineering. We design for web, mobile, and SaaS products with a focus on usability and conversion.',
  },
  {
    q: 'What is digital transformation and can you help our business with it?',
    a: 'Digital transformation means using modern technology to reimagine how your business operates. We help companies modernise legacy systems, migrate to the cloud, automate manual processes, and build new digital products — delivering measurable ROI at every stage.',
  },
]);

const breadcrumbJsonLd = buildBreadcrumbSchema([
  { name: 'Home', url: SITE.url },
  { name: 'Services', url: `${SITE.url}/services` },
]);

export default function ServicesPage() {
  return (
    <div className="page-enter">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesFaqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section style={{ paddingTop: 160, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
        <div className="blueprint" />
        <div className="container" style={{ position: 'relative' }}>
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Services' }]} />
          <Eyebrow>Services · Catalogue</Eyebrow>
          <h1 style={{ marginTop: 24, maxWidth: 900 }}>
            Custom Software, MERN Stack, React.js & Node.js Development Services.
          </h1>
          <p className="lead" style={{ marginTop: 28 }}>
            Six engineering practices — custom software development, SaaS product engineering, dedicated developer pods,
            testing & QA, cloud migration, and ongoing support. Pick the one that fits, or hire us across multiple.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {DETAIL_SERVICES.map((s, i) => (
            <Reveal key={s.tag} delay={i * 60}>
              <ScrollFloat speed={0.04}>
                <article
                  className="card ticked"
                  id={`service-${s.tag}`}
                  style={{ padding: 0, overflow: 'hidden', position: 'relative' }}
                  aria-label={s.title}
                >
                  <CornerTicks />
                  <div className="srv-row">
                    <div
                      style={{
                        padding: 36,
                        borderRight: '1px solid var(--line)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.14em' }}>
                          SERVICE / {s.tag}
                        </span>
                        <div
                          style={{
                            marginTop: 18,
                            width: 56,
                            height: 56,
                            borderRadius: 14,
                            border: '1px solid var(--accent-edge)',
                            background: 'var(--accent-soft)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent)',
                          }}
                        >
                          <Icon name={s.icon} size={26} />
                        </div>
                      </div>
                      <Link href="/contact" className="btn btn-ghost" style={{ padding: '10px 14px', fontSize: 13 }}>
                        Brief us <Icon name="arrow" size={12} />
                      </Link>
                    </div>
                    <div style={{ padding: 36, borderRight: '1px solid var(--line)' }}>
                      <h2 style={{ marginBottom: 14, fontSize: 24 }}>{s.title}</h2>
                      <p style={{ color: 'var(--fg-2)', marginBottom: 24 }}>{s.body}</p>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                        Deliverables
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {s.deliverables.map((d) => (
                          <li key={d} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'var(--fg-2)' }}>
                            <span style={{ color: 'var(--accent)' }}>—</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ padding: 36, background: 'var(--bg-1)' }}>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
                        Stack we use
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {s.stack.map((t) => (
                          <span key={t} className="chip">{t}</span>
                        ))}
                      </div>
                      <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px dashed var(--line)' }}>
                        <SpecLine label="Engagement" value="Fixed / T&M / Pod" />
                        <SpecLine label="Start in" value="2 weeks" />
                      </div>
                    </div>
                  </div>
                </article>
              </ScrollFloat>
            </Reveal>
          ))}
        </div>
      </section>

      <CTABanner />
    </div>
  );
}
