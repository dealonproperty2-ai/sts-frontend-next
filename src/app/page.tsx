import type { Metadata } from 'next';
import Script from 'next/script';
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

const SITE_URL = process.env.SITE_URL || 'https://steptosoft.com';

export const metadata: Metadata = {
  title: 'Step To Soft — Software Engineering, Consulting & Outsourcing',
  description:
    'A 25-engineer product studio in Asansol. Custom software, SaaS engineering, dedicated developer pods, cloud migration, QA. Shipping worldwide since 2018.',
  alternates: { canonical: '/' },
  openGraph: {
    url: '/',
    title: 'Step To Soft — Software Engineering Studio',
    description:
      'Custom software, SaaS engineering & dedicated developer pods. Shipping worldwide since 2018.',
  },
};

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Step To Soft',
  url: SITE_URL,
  image: `${SITE_URL}/og.png`,
  priceRange: '$$',
  telephone: '+91-9999988888',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Asansol',
    addressRegion: 'West Bengal',
    addressCountry: 'IN',
  },
  areaServed: 'Worldwide',
  serviceType: [
    'Custom Software Development',
    'SaaS Product Engineering',
    'Dedicated Developer Pods',
    'Testing & QA',
    'Cloud & Migration',
    'Maintenance & Support',
  ],
};

export default function HomePage() {
  return (
    <div className="page-enter">
      <Script
        id="ld-home"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
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
