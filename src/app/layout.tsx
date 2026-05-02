import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import '../styles/globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
});

const SITE_URL = process.env.SITE_URL || 'https://steptosoft.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Step To Soft — Software Engineering, Consulting & Outsourcing',
    template: '%s | Step To Soft',
  },
  description:
    'Step To Soft is a 25-engineer product studio in Asansol, India. Custom software, SaaS engineering, dedicated developer pods, cloud migration, QA, and a full-stack web bootcamp. Shipping worldwide since 2018.',
  keywords: [
    'software engineering',
    'custom software development',
    'SaaS engineering',
    'dedicated developer team',
    'web development bootcamp',
    'Asansol software company',
    'India software outsourcing',
    'Step To Soft',
    'steptosoft',
  ],
  authors: [{ name: 'Step To Soft' }],
  creator: 'Step To Soft',
  publisher: 'Step To Soft Pvt. Ltd.',
  applicationName: 'Step To Soft',
  category: 'technology',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Step To Soft',
    title: 'Step To Soft — Software Engineering, Consulting & Outsourcing',
    description:
      'Custom software, SaaS engineering & dedicated developer pods. Built in Asansol, shipping worldwide since 2018.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Step To Soft — Software studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Step To Soft — Software Engineering, Consulting & Outsourcing',
    description:
      'Custom software, SaaS engineering & dedicated developer pods. Built in Asansol, shipping worldwide.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0d' },
    { media: '(prefers-color-scheme: light)', color: '#f7f6f1' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Step To Soft',
  legalName: 'Step To Soft Pvt. Ltd.',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  foundingDate: '2018',
  email: 'hello@steptosoft.com',
  telephone: '+91-9999988888',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Asansol',
    addressRegion: 'West Bengal',
    addressCountry: 'IN',
  },
  sameAs: [
    'https://www.linkedin.com/company/steptosoft',
    'https://github.com/steptosoft',
  ],
  description:
    'A 25-engineer product studio offering custom software development, SaaS engineering, dedicated developer pods, and a full-stack web bootcamp.',
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  url: SITE_URL,
  name: 'Step To Soft',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/courses?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-card-style="glass"
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
    >
      <body>
        <Script
          id="ld-org"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Script
          id="ld-website"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <a
          href="#main"
          style={{
            position: 'absolute',
            left: -9999,
            top: 'auto',
            width: 1,
            height: 1,
            overflow: 'hidden',
          }}
        >
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
