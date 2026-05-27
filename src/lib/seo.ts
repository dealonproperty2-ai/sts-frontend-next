// Central SEO configuration, keyword sets, and structured-data builders.
// Every page imports from here — update once, propagates everywhere.

export const SITE = {
  url: process.env.SITE_URL || 'https://steptosoft.com',
  name: 'Step To Soft',
  legalName: 'Step To Soft Pvt. Ltd.',
  tagline: 'Software Engineering, Consulting & Outsourcing',
  description:
    'Step To Soft is a 25-engineer software development company in Asansol, India. We deliver custom software, MERN stack development, React.js, Node.js, mobile app development, UI/UX design, and digital transformation services worldwide since 2018.',
  email: 'hello@steptosoft.com',
  infoEmail: 'info@steptosoft.com',
  phone: '+91-3413556956',
  address: {
    street: 'Module-21, Asansol Webel IT Park',
    city: 'Asansol',
    region: 'West Bengal',
    postalCode: '713304',
    country: 'IN',
  },
  geo: { latitude: 23.685, longitude: 86.966 },
  social: {
    linkedin: 'https://www.linkedin.com/company/steptosoft',
    github: 'https://github.com/steptosoft',
  },
  founded: '2018',
  priceRange: '$$',
} as const;

// ── Keyword sets ────────────────────────────────────────────────────────────

export const BASE_KEYWORDS: string[] = [
  'web development company',
  'software development company',
  'IT services company India',
  'MERN stack development',
  'React.js development',
  'Node.js development',
  'custom software solutions',
  'software development services',
  'digital transformation services',
  'mobile app development',
  'UI/UX design services',
  'software outsourcing India',
  'dedicated development team',
  'SaaS product development',
  'full stack development company',
  'web application development',
  'Step To Soft',
  'steptosoft',
  'Asansol software company',
  'India software development',
];

export const SERVICE_KEYWORDS: string[] = [
  'custom software development company',
  'enterprise software development',
  'web application development services',
  'React.js development company',
  'Node.js backend development',
  'MERN stack development services',
  'cloud migration services',
  'dedicated developer team India',
  'software QA testing services',
  'SaaS product engineering company',
  'IT outsourcing company India',
  'software consulting services India',
  'agile software development',
  'microservices development',
  'API development services',
  'software product development company',
];

export const COURSE_KEYWORDS: string[] = [
  'web development bootcamp India',
  'MERN stack course online',
  'React.js training India',
  'Node.js developer training',
  'full stack developer course',
  'JavaScript bootcamp India',
  'online web development course',
  'software development training',
  'coding bootcamp Asansol',
  'learn MERN stack online',
  'React developer course India',
  'Node.js backend training',
  'HTML CSS JavaScript course',
  'web dev bootcamp with placement',
];

// ── Schema builders ─────────────────────────────────────────────────────────

export interface FAQItem {
  q: string;
  a: string;
}

export interface BreadcrumbEntry {
  name: string;
  url?: string;
}

export function buildFAQSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function buildBreadcrumbSchema(items: BreadcrumbEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export function buildHowToSchema(
  name: string,
  description: string,
  steps: Array<{ name: string; text: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE.url}/logo3.png`,
      width: 512,
      height: 512,
    },
    foundingDate: SITE.founded,
    numberOfEmployees: { '@type': 'QuantitativeValue', value: 25 },
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
    sameAs: [SITE.social.linkedin, SITE.social.github],
    description: SITE.description,
    knowsAbout: [
      'Software Engineering',
      'Web Development',
      'MERN Stack',
      'React.js',
      'Node.js',
      'Mobile App Development',
      'UI/UX Design',
      'Cloud Computing',
      'DevOps',
      'SaaS Development',
      'Digital Transformation',
      'Custom Software Development',
    ],
  };
}

export function buildLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': `${SITE.url}/#localbusiness`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: `${SITE.url}/logo3.png`,
    image: `${SITE.url}/opengraph-image`,
    description: SITE.description,
    foundingDate: SITE.founded,
    numberOfEmployees: { '@type': 'QuantitativeValue', value: 25 },
    email: SITE.infoEmail,
    telephone: SITE.phone,
    priceRange: SITE.priceRange,
    currenciesAccepted: 'USD, INR, EUR, GBP',
    paymentAccepted: 'Bank Transfer, PayPal, Wire Transfer',
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
    areaServed: { '@type': 'AdministrativeArea', name: 'Worldwide' },
    serviceType: [
      'Custom Software Development',
      'MERN Stack Development',
      'React.js Development',
      'Node.js Development',
      'Mobile App Development',
      'UI/UX Design Services',
      'Digital Transformation',
      'SaaS Product Engineering',
      'Dedicated Developer Pods',
      'Software Testing & QA',
      'Cloud Migration',
      'Web Development Training',
    ],
    sameAs: [SITE.social.linkedin, SITE.social.github],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '48',
      bestRating: '5',
      worstRating: '1',
    },
    hasMap: `https://maps.google.com/?q=${SITE.geo.latitude},${SITE.geo.longitude}`,
  };
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.url}/courses?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
