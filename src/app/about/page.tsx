import type { Metadata } from 'next';
import Image from 'next/image';
import { Eyebrow, SectionHead, CornerTicks } from '@/components/Primitives';
import { Reveal, TiltCard } from '@/components/Parallax';
import Icon from '@/components/Icon';
import { Breadcrumb } from '@/components/Breadcrumb';
import CTABanner from '@/components/CTABanner';
import { SITE, BASE_KEYWORDS, buildBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About Step To Soft — Software Development Company in India Since 2018',
  description:
    'Step To Soft is a 25-engineer software development company in Asansol, India, founded in 2018. No freelancers, NDA by default, daily-deploy rhythm. 120+ products delivered across web development, MERN stack, React.js, Node.js & mobile app development.',
  keywords: [
    ...BASE_KEYWORDS,
    'software development company India',
    'IT company Asansol',
    'software engineering company India',
    'web development company Asansol',
    'about Step To Soft',
    'India IT services company',
    'software company West Bengal',
    'custom software company India',
    'React.js company India',
    'Node.js company India',
  ],
  alternates: { canonical: '/about' },
  openGraph: {
    url: '/about',
    type: 'website',
    title: 'About Step To Soft — Software Development Company in India Since 2018',
    description:
      'Founded in 2018. 25 in-house engineers, no freelancers. Daily-deploy rhythm, NDA by default. 120+ products delivered in web development, MERN stack, React.js & Node.js.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Step To Soft — Software Development Company in India Since 2018',
    description:
      'Founded in 2018. 25 in-house engineers, no freelancers. 120+ products shipped worldwide.',
  },
};

const TEAM = [
  { name: 'Jamil Akhter', role: 'Founder · CEO', img: 'founder.jpg', jobTitle: 'Chief Executive Officer' },
  { name: 'Farhat Naaz', role: 'Director · Engineering', img: 'director.jpg', jobTitle: 'Director of Engineering' },
  { name: 'Rohan Das', role: 'Tech Lead', img: 'team1.jpg', jobTitle: 'Technical Lead' },
  { name: 'Anika Roy', role: 'Lead Designer', img: 'team2.jpg', jobTitle: 'Lead UI/UX Designer' },
  { name: 'Vikram Iyer', role: 'Senior Engineer', img: 'team3.jpg', jobTitle: 'Senior Software Engineer' },
  { name: 'Meera Pal', role: 'QA Lead', img: 'team4.jpg', jobTitle: 'QA Lead Engineer' },
  { name: 'Karan Mehta', role: 'DevOps', img: 'team5.jpg', jobTitle: 'DevOps Engineer' },
  { name: 'Sneha Kapoor', role: 'Product Manager', img: 'team6.jpg', jobTitle: 'Product Manager' },
];

const VALUES = [
  { tag: 'V1', title: 'Own the outcome', body: "We don't bill against tickets — we bill against shipped value." },
  { tag: 'V2', title: 'No freelancers', body: 'Every engineer is in-house. NDA-protected, payroll, accountable.' },
  { tag: 'V3', title: 'Boring is good', body: 'We pick the calmest tech that solves the problem. Hype is for slides.' },
  { tag: 'V4', title: 'Daily ground truth', body: 'Daily standups, daily deploys, daily clarity. No surprises on Friday.' },
];

const aboutJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${SITE.url}/about`,
  url: `${SITE.url}/about`,
  name: 'About Step To Soft — Software Development Company in India',
  description:
    'Founded in 2018. 25 in-house software engineers specialising in custom software, MERN stack, React.js, Node.js, mobile app development and digital transformation. No freelancers. NDA by default.',
  about: {
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: 'Step To Soft',
    foundingDate: '2018',
    numberOfEmployees: { '@type': 'QuantitativeValue', value: 25 },
  },
};

const teamJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Step To Soft Leadership Team',
  itemListElement: TEAM.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Person',
      name: p.name,
      jobTitle: p.jobTitle,
      worksFor: {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: 'Step To Soft',
      },
      image: `${SITE.url}/team/${p.img}`,
    },
  })),
};

const breadcrumbJsonLd = buildBreadcrumbSchema([
  { name: 'Home', url: SITE.url },
  { name: 'About', url: `${SITE.url}/about` },
]);

export default function AboutPage() {
  return (
    <div className="page-enter">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }} />
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
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />
          <Eyebrow>About · Step To Soft</Eyebrow>
          <h1 style={{ marginTop: 24, maxWidth: 1000 }}>
            A 25-engineer software development company in Asansol, India — building software the world ships on.
          </h1>
          <p className="lead" style={{ marginTop: 32 }}>
            Founded in 2018 by a group of product engineers who&apos;d spent years inside agencies,
            telcos, and product startups. We started Step To Soft to do client work the way we&apos;d
            always wished it was done: in-house, NDA-protected, daily-deploy, no freelancers. Seven
            years and 120+ engagements later — delivering custom software, MERN stack, React.js, Node.js,
            mobile apps, and digital transformation projects — that&apos;s still the rule.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="about-grid">
            <TiltCard max={5}>
              <div className="card ticked" style={{ padding: 0, overflow: 'hidden' }}>
                <CornerTicks />
                <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
                  <Image
                    src="/asansol-hq.jpg"
                    alt="Step To Soft software development studio — Asansol HQ, West Bengal, India"
                    fill
                    priority
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 980px) 100vw, 50vw"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 14,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#fff',
                      textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                    }}
                  >
                    STUDIO · ASANSOL HQ · INDIA
                  </div>
                </div>
              </div>
            </TiltCard>
            <div>
              <SectionHead eyebrow="The studio" title="What you actually get when you hire us." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {[
                  ['Engineers, not contractors', 'Every name on your invoice is on our payroll, in our office, under our NDA.'],
                  ['Daily-deploy rhythm', 'Two-week sprints, daily PR merges, daily standup with you. No mystery.'],
                  ['Confidentiality, by default', 'Strict NDA from day zero — including idea-level discovery calls.'],
                  ['Flexible engagement', 'Fixed-price, hourly, or monthly retainer. Switch as the work matures.'],
                ].map(([h, b]) => (
                  <div key={h} style={{ display: 'flex', gap: 16 }}>
                    <Icon name="check" size={18} stroke={2} />
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{h}</div>
                      <p style={{ fontSize: 14, color: 'var(--fg-3)' }}>{b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="section"
        style={{
          background: 'var(--bg-1)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="container">
          <SectionHead eyebrow="House values" title="Four rules we ship by." />
          <div className="grid-4">
            {VALUES.map((v, i) => (
              <Reveal key={v.tag} delay={i * 60}>
                <div className="card ticked" style={{ padding: 28, minHeight: 220, position: 'relative' }}>
                  <CornerTicks />
                  <span className="mono" style={{ color: 'var(--accent)', fontSize: 11, letterSpacing: '0.14em' }}>
                    /{v.tag}
                  </span>
                  <h3 style={{ marginTop: 14, marginBottom: 10, fontSize: 22 }}>{v.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--fg-3)' }}>{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow="The people"
            title="Built by humans you can talk to."
            sub="Meet a slice of the studio. Eight of twenty-five."
          />
          <div className="grid-4">
            {TEAM.map((p, i) => (
              <Reveal key={p.name} delay={i * 50}>
                <TiltCard max={6}>
                  <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ aspectRatio: '4/5', position: 'relative' }}>
                      <Image
                        src={`/team/${p.img}`}
                        alt={`${p.name}, ${p.jobTitle} at Step To Soft — software development company India`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 25vw"
                        style={{ objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.85))',
                        }}
                      />
                      <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18 }}>
                        <div style={{ fontWeight: 500, color: '#fff', fontSize: 16 }}>{p.name}</div>
                        <div
                          className="mono"
                          style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}
                        >
                          {p.role}
                        </div>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-1)', borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div className="grid-4">
            {[
              ['7+', 'Years shipping'],
              ['25', 'In-house engineers'],
              ['120+', 'Products delivered'],
              ['18', 'Countries served'],
            ].map(([n, l]) => (
              <div key={l} style={{ borderLeft: '1px solid var(--line-strong)', paddingLeft: 24 }}>
                <div style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 500, letterSpacing: '-0.03em' }}>{n}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </div>
  );
}
