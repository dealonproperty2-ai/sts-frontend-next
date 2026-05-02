import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import Icon, { IconName } from '@/components/Icon';
import { CornerTicks, Eyebrow, SpecLine } from '@/components/Primitives';
import { Reveal, ScrollFloat } from '@/components/Parallax';
import CTABanner from '@/components/CTABanner';

const SITE_URL = process.env.SITE_URL || 'https://steptosoft.com';

export const metadata: Metadata = {
  title: 'Services — Custom Software, SaaS, Dev Pods, QA & Cloud',
  description:
    'Six engineering practices: custom software, SaaS product engineering, dedicated developer pods, testing & QA, cloud migration, and maintenance. Pick one or hire us across all.',
  alternates: { canonical: '/services' },
  openGraph: { url: '/services', title: 'Services — Step To Soft' },
};

interface ServiceDef {
  icon: IconName;
  tag: string;
  title: string;
  body: string;
  deliverables: string[];
  stack: string[];
}

const DETAIL_SERVICES: ServiceDef[] = [
  {
    icon: 'code',
    tag: '01',
    title: 'Custom Software Development',
    body: "When off-the-shelf can't do it, we build it. From internal tools that save your ops team 20 hours a week to customer-facing platforms that scale to millions.",
    deliverables: ['Discovery & spec', 'Architecture doc', 'CI/CD pipeline', 'Production deploys', 'Handover or ongoing support'],
    stack: ['Node.js', 'Python', '.NET', 'Postgres', 'Redis', 'AWS', 'Docker'],
  },
  {
    icon: 'layers',
    tag: '02',
    title: 'SaaS Product Engineering',
    body: 'Take an idea from PRD to paying customers. We handle the full SaaS stack — multi-tenancy, billing, auth, observability, the lot.',
    deliverables: ['MVP in 8 weeks', 'Multi-tenant architecture', 'Stripe billing', 'Auth + RBAC', 'Observability stack'],
    stack: ['Next.js', 'tRPC', 'Postgres', 'Stripe', 'Auth0', 'Vercel', 'Sentry'],
  },
  {
    icon: 'users',
    tag: '03',
    title: 'Dedicated Developer Pods',
    body: 'A self-driving pod (PM + engineers + QA) that operates as your team. We hire, manage, and replace — you get the velocity.',
    deliverables: ['Onboard in 2 weeks', 'Daily standup with you', 'Linear/Jira on your tools', 'Code in your repos', 'Monthly retro'],
    stack: ['Any stack you run', 'Your CI/CD', 'Your repos', 'Your tools'],
  },
  {
    icon: 'shield',
    tag: '04',
    title: 'Testing & QA',
    body: "Manual + automated test suites that catch what your team won't. Performance, security, regression — modern frameworks, full reporting.",
    deliverables: ['Test strategy', 'E2E suites (Playwright/Cypress)', 'Load tests (k6/JMeter)', 'Security audits', 'CI gates'],
    stack: ['Playwright', 'Cypress', 'k6', 'Jest', 'Burp', 'OWASP ZAP'],
  },
  {
    icon: 'cloud',
    tag: '05',
    title: 'Cloud & Migration',
    body: 'Modernize legacy stacks. Move to AWS/GCP/Azure. Cut ops cost, increase deploy frequency, and stop worrying about Friday outages.',
    deliverables: ['Cloud assessment', 'Migration plan', 'IaC (Terraform)', 'Zero-downtime cutover', 'Cost optimisation'],
    stack: ['AWS', 'GCP', 'Azure', 'Terraform', 'Kubernetes', 'Cloudflare'],
  },
  {
    icon: 'wrench',
    tag: '06',
    title: 'Maintenance & Support',
    body: "We run software once it's shipped. Proactive monitoring, bug triage, perf tuning, and steady feature drops — like a tiny product team you rent.",
    deliverables: ['24/5 monitoring', 'Bug SLA', 'Monthly perf review', 'Dependency upgrades', 'Roadmap delivery'],
    stack: ['Datadog', 'PagerDuty', 'Sentry', 'GitHub Actions', 'Linear'],
  },
];

const servicesJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: DETAIL_SERVICES.map((s, i) => ({
    '@type': 'Service',
    position: i + 1,
    name: s.title,
    description: s.body,
    provider: { '@type': 'Organization', name: 'Step To Soft', url: SITE_URL },
    areaServed: 'Worldwide',
  })),
};

export default function ServicesPage() {
  return (
    <div className="page-enter">
      <Script
        id="ld-services"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesJsonLd) }}
      />
      <section style={{ paddingTop: 160, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
        <div className="blueprint" />
        <div className="container" style={{ position: 'relative' }}>
          <Eyebrow>Services · Catalogue</Eyebrow>
          <h1 style={{ marginTop: 24, maxWidth: 900 }}>Six ways we ship software for you.</h1>
          <p className="lead" style={{ marginTop: 28 }}>
            Pick the one that fits — or hire us across multiple. We work as one studio with a single
            point of contact.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {DETAIL_SERVICES.map((s, i) => (
            <Reveal key={s.tag} delay={i * 60}>
              <ScrollFloat speed={0.04}>
                <div className="card ticked" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
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
                        <span
                          className="mono"
                          style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.14em' }}
                        >
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
                      <h3 style={{ marginBottom: 14 }}>{s.title}</h3>
                      <p style={{ color: 'var(--fg-2)', marginBottom: 24 }}>{s.body}</p>
                      <div
                        className="mono"
                        style={{
                          fontSize: 11,
                          color: 'var(--fg-3)',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          marginBottom: 12,
                        }}
                      >
                        Deliverables
                      </div>
                      <ul
                        style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 8,
                        }}
                      >
                        {s.deliverables.map((d) => (
                          <li
                            key={d}
                            style={{
                              display: 'flex',
                              gap: 8,
                              fontSize: 14,
                              color: 'var(--fg-2)',
                            }}
                          >
                            <span style={{ color: 'var(--accent)' }}>—</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ padding: 36, background: 'var(--bg-1)' }}>
                      <div
                        className="mono"
                        style={{
                          fontSize: 11,
                          color: 'var(--fg-3)',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          marginBottom: 16,
                        }}
                      >
                        Stack we use
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {s.stack.map((t) => (
                          <span key={t} className="chip">
                            {t}
                          </span>
                        ))}
                      </div>
                      <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px dashed var(--line)' }}>
                        <SpecLine label="Engagement" value="Fixed / T&M / Pod" />
                        <SpecLine label="Start in" value="2 weeks" />
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollFloat>
            </Reveal>
          ))}
        </div>
      </section>

      <CTABanner />
    </div>
  );
}
