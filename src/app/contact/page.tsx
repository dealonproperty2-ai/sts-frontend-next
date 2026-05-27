import type { Metadata } from 'next';
import { CornerTicks, Eyebrow, SpecLine } from '@/components/Primitives';
import Icon, { IconName } from '@/components/Icon';
import { Breadcrumb } from '@/components/Breadcrumb';
import ContactForm from './ContactForm';
import { SITE, BASE_KEYWORDS, SERVICE_KEYWORDS, buildFAQSchema, buildBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Contact Step To Soft — Hire a Software Development Company in India',
  description:
    'Get in touch with Step To Soft for custom software development, MERN stack, React.js, Node.js, mobile app development, UI/UX design & digital transformation projects. Assured response in 1 business day. Discovery call within a week.',
  keywords: [
    ...BASE_KEYWORDS,
    ...SERVICE_KEYWORDS,
    'contact software development company India',
    'hire software developers India',
    'hire React.js developers',
    'hire Node.js developers',
    'software development quote India',
    'custom software development inquiry',
    'IT services inquiry India',
    'software company contact India',
    'get software development estimate',
    'outsource software development India',
  ],
  alternates: { canonical: '/contact' },
  openGraph: {
    url: '/contact',
    type: 'website',
    title: 'Contact Step To Soft — Hire a Software Development Company in India',
    description:
      'Hire Step To Soft for custom software, MERN stack, React.js, Node.js, mobile app & digital transformation projects. Response in 1 business day.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Step To Soft — Hire a Software Development Company in India',
    description:
      'Custom software, MERN stack, React.js, Node.js & digital transformation. Discovery call within a week, proposal in 48 hours.',
  },
};

const contactJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  '@id': `${SITE.url}/contact`,
  url: `${SITE.url}/contact`,
  name: 'Contact Step To Soft — Software Development Enquiry',
  description: 'Contact Step To Soft to discuss your custom software, web development, MERN stack, React.js, Node.js, mobile app, or digital transformation project.',
  breadcrumb: buildBreadcrumbSchema([
    { name: 'Home', url: SITE.url },
    { name: 'Contact', url: `${SITE.url}/contact` },
  ]),
  mainEntity: {
    '@type': 'LocalBusiness',
    '@id': `${SITE.url}/#localbusiness`,
    name: SITE.name,
    url: SITE.url,
    telephone: SITE.phone,
    email: SITE.infoEmail,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '10:00',
        closes: '19:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '10:00',
        closes: '14:00',
      },
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: SITE.phone,
        email: SITE.infoEmail,
        contactType: 'sales',
        areaServed: 'Worldwide',
        availableLanguage: ['en', 'hi', 'bn'],
        hoursAvailable: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '10:00',
          closes: '19:00',
        },
      },
      {
        '@type': 'ContactPoint',
        telephone: SITE.phone,
        contactType: 'customer service',
        areaServed: 'Worldwide',
        availableLanguage: ['en', 'hi', 'bn'],
      },
    ],
  },
};

const contactFaqJsonLd = buildFAQSchema([
  {
    q: 'How do I hire Step To Soft for a software development project?',
    a: 'Fill out our contact form or email info@steptosoft.com with a brief description of your project. We respond within 1 business day and schedule a free 30-minute discovery call within a week. After the call, you receive a scoped proposal with timeline and pricing within 48 hours.',
  },
  {
    q: 'What information should I include when contacting Step To Soft?',
    a: 'Include your project type (web app, mobile app, SaaS, etc.), key features, rough timeline, budget range, and preferred engagement model (fixed-price, T&M, or dedicated pod). The more detail you provide, the more accurate our proposal will be.',
  },
  {
    q: 'How quickly does Step To Soft respond to project enquiries?',
    a: 'We guarantee a response within 1 business day for all project enquiries received via our contact form or email. Discovery calls are scheduled within one week of initial contact.',
  },
  {
    q: 'Does Step To Soft provide free project estimates?',
    a: 'Yes. The discovery call and initial scoped proposal are completely free with no commitment required. We provide a detailed estimate including team composition, timeline, technology stack, and pricing options.',
  },
  {
    q: 'Can I visit the Step To Soft studio in Asansol?',
    a: 'Yes. Our studio is located at Module-21, Asansol Webel IT Park, Asansol, West Bengal 713304, India. We welcome client visits by appointment during business hours (Mon–Fri 10:00–19:00 IST, Sat 10:00–14:00 IST).',
  },
]);

const breadcrumbJsonLd = buildBreadcrumbSchema([
  { name: 'Home', url: SITE.url },
  { name: 'Contact', url: `${SITE.url}/contact` },
]);

interface CardItem {
  icon: IconName;
  label: string;
  value: string;
  sub: string;
}

const CARDS: CardItem[] = [
  { icon: 'mail', label: 'Email', value: 'info@steptosoft.com', sub: 'Mon–Fri · <1d response' },
  { icon: 'phone', label: 'Phone', value: '+91-3413556956', sub: '10:00–19:00 IST' },
  {
    icon: 'pin',
    label: 'Studio',
    value: 'Module-21, Asansol Webel IT Park, Asansol-713304, West Bengal, India',
    sub: 'India · Remote-friendly',
  },
];

export default function ContactPage() {
  return (
    <div className="page-enter">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactFaqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

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
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />
          <Eyebrow>Contact · Now accepting projects</Eyebrow>
          <h1 style={{ marginTop: 24, maxWidth: 900 }}>
            Hire a Software Development Company in India — Tell Us What You Want to Ship.
          </h1>
          <p className="lead" style={{ marginTop: 28 }}>
            Assured response in 1 business day. Discovery call within a week. Scoped proposal in 48
            hours after the call. We build custom software, MERN stack apps, React.js frontends,
            Node.js backends, mobile apps & more.
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
                        width: 44, height: 44, borderRadius: 12,
                        border: '1px solid var(--accent-edge)',
                        background: 'var(--accent-soft)',
                        color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Icon name={c.icon} size={20} />
                    </div>
                    <div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                        {c.label}
                      </div>
                      <address style={{ fontStyle: 'normal', fontSize: 16, fontWeight: 500, marginTop: 4 }}>{c.value}</address>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{c.sub}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="card" style={{ padding: 24, background: 'var(--bg-1)' }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>
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
