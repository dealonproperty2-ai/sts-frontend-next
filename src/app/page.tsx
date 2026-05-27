import type { Metadata } from 'next';
import {
  HeroFloatingCards,
  StackMarquee,
  ServicesGrid,
  ProcessSection,
  EngagementSection,
  TrainingTeaser,
  TestimonialSection,
} from '@/components/HomeSections';
import CTABanner from '@/components/CTABanner';
import {
  SITE,
  BASE_KEYWORDS,
  SERVICE_KEYWORDS,
  buildFAQSchema,
  buildHowToSchema,
} from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Step To Soft — Web Development, Software Engineering & IT Services Company',
  description:
    'Step To Soft is a top-rated web development and software engineering company in India. Expert MERN stack, React.js, Node.js, mobile app development, UI/UX design & digital transformation services. 120+ products delivered worldwide since 2018.',
  keywords: [
    ...BASE_KEYWORDS,
    ...SERVICE_KEYWORDS,
    'best software development company India',
    'top web development company',
    'hire React.js developers India',
    'hire Node.js developers',
    'MERN stack development company India',
    'software development company Asansol',
    'web development services India',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    url: '/',
    type: 'website',
    title: 'Step To Soft — Web Development, Software Engineering & IT Services',
    description:
      'Top-rated software engineering studio — custom software, MERN stack, React.js, Node.js, mobile apps & digital transformation. 25 engineers, 120+ products, 18 countries.',
  },
};

const professionalServiceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${SITE.url}/#professionalservice`,
  name: 'Step To Soft',
  url: SITE.url,
  image: `${SITE.url}/opengraph-image`,
  priceRange: '$$',
  telephone: SITE.phone,
  address: {
    '@type': 'PostalAddress',
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.city,
    addressRegion: SITE.address.region,
    postalCode: SITE.address.postalCode,
    addressCountry: SITE.address.country,
  },
  areaServed: 'Worldwide',
  serviceType: [
    'Custom Software Development',
    'Web Development',
    'MERN Stack Development',
    'React.js Development',
    'Node.js Development',
    'Mobile App Development',
    'UI/UX Design Services',
    'Digital Transformation',
    'SaaS Product Engineering',
    'Dedicated Developer Pods',
    'Testing & QA',
    'Cloud & Migration',
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '48',
    bestRating: '5',
  },
  review: [
    {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5' },
      author: { '@type': 'Person', name: 'Head of Engineering' },
      reviewBody:
        'S2S spun up a 6-engineer pod in two weeks and shipped our v2 within a quarter. The handoff was clean, the code is ours.',
    },
    {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5' },
      author: { '@type': 'Person', name: 'CTO' },
      reviewBody:
        'We treated them like a co-founding team — same standup, same Linear board. Zero distance.',
    },
    {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5' },
      author: { '@type': 'Person', name: 'VP Product' },
      reviewBody:
        'Their QA pod caught issues our internal team missed. They run it like a discipline, not a checkbox.',
    },
  ],
};

const homeFaqJsonLd = buildFAQSchema([
  {
    q: 'What software development services does Step To Soft offer?',
    a: 'Step To Soft offers custom software development, MERN stack development, React.js development, Node.js backend development, mobile app development, UI/UX design, SaaS product engineering, dedicated developer pods, cloud migration, software testing & QA, and digital transformation services.',
  },
  {
    q: 'Does Step To Soft offer MERN stack development services?',
    a: 'Yes. MERN stack (MongoDB, Express.js, React.js, Node.js) development is one of our core specialisations. We build full-stack web applications using the MERN stack for startups, scale-ups, and enterprises worldwide.',
  },
  {
    q: 'Can Step To Soft build a React.js or Node.js application for my business?',
    a: 'Absolutely. We have a dedicated team of React.js and Node.js developers who have shipped 120+ production applications. We handle everything from UI/UX design to deployment and post-launch support.',
  },
  {
    q: 'Where is Step To Soft located, and do you work with international clients?',
    a: 'Our studio is based in Asansol, West Bengal, India. We work with clients across 18+ countries including the US, UK, Singapore, Australia, Canada, and the UAE. All engagements are NDA-protected from day one.',
  },
  {
    q: 'What engagement models does Step To Soft offer?',
    a: 'We offer three engagement models: Dedicated Developer Pods (a self-managed team embedded in your stack), Team Augmentation (plug-in engineers for your existing team), and Project-Based (fixed-price or T&M with milestone billing). We can start in as little as two weeks.',
  },
  {
    q: 'How much does custom software development cost at Step To Soft?',
    a: 'Pricing depends on project scope, team size, and engagement type. We offer fixed-price quotes for well-scoped projects and monthly retainers for ongoing work. Contact us for a free discovery call and scoped proposal within 48 hours.',
  },
  {
    q: 'Do you offer mobile app development services?',
    a: 'Yes. We build cross-platform and native mobile applications for iOS and Android. Our mobile development stack includes React Native, Flutter, and native Swift/Kotlin depending on your requirements.',
  },
  {
    q: 'What is digital transformation and does Step To Soft provide it?',
    a: 'Digital transformation is the process of leveraging modern technology to fundamentally change how a business operates and delivers value. Step To Soft provides end-to-end digital transformation services including cloud migration, process automation, legacy modernisation, and building new digital products.',
  },
]);

const howToEngageJsonLd = buildHowToSchema(
  'How to Hire Step To Soft for Software Development',
  'A step-by-step guide to engaging Step To Soft as your software development partner.',
  [
    {
      name: 'Discovery Call',
      text: 'Book a free 30-minute discovery call. Describe your project and goals. We respond within 1 business day and schedule the call within a week.',
    },
    {
      name: 'Scoped Proposal',
      text: 'Within 48 hours of the discovery call, our tech lead delivers a scoped proposal with architecture notes, team composition, timeline, and fixed-price or T&M quote.',
    },
    {
      name: 'Sprint Kickoff',
      text: 'We onboard your project in two weeks. You get daily deploys, daily standups, and complete access to your repos and tools from day one.',
    },
    {
      name: 'Ongoing Delivery',
      text: 'Two-week sprints with velocity tracking. You see real progress every day. Monthly retros keep the engagement on track.',
    },
  ],
);

export default function HomePage() {
  return (
    <div className="page-enter">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(professionalServiceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToEngageJsonLd) }}
      />
      <HeroFloatingCards />
      <StackMarquee />
      <ServicesGrid />
      <ProcessSection />
      <EngagementSection />
      <TrainingTeaser />
      <TestimonialSection />
      <CTABanner />
    </div>
  );
}
