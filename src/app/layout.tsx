import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import '../styles/globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { ThemeScript } from '@/components/ThemeScript';
import { ThemeProvider } from '@/components/ThemeProvider';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import {
  SITE,
  BASE_KEYWORDS,
  buildOrganizationSchema,
  buildLocalBusinessSchema,
  buildWebSiteSchema,
} from '@/lib/seo';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'Step To Soft — Web Development, Software Engineering & IT Services',
    template: '%s | Step To Soft',
  },
  description:
    'Step To Soft is a leading web development and software engineering company in India. We offer custom software development, MERN stack, React.js, Node.js, mobile app development, UI/UX design, and digital transformation services worldwide since 2018.',
  keywords: [
    ...BASE_KEYWORDS,
    'web development company India',
    'software engineering company',
    'React.js development company India',
    'Node.js development company',
    'MERN stack development company',
    'mobile app development India',
    'UI/UX design company India',
    'digital transformation company',
    'custom software development India',
    'software outsourcing company',
    'IT services Asansol',
    'West Bengal software company',
  ],
  authors: [{ name: 'Step To Soft', url: SITE.url }],
  creator: 'Step To Soft',
  publisher: 'Step To Soft Pvt. Ltd.',
  applicationName: 'Step To Soft',
  category: 'technology',
  classification: 'Software Development & IT Services',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: {
    canonical: '/',
    languages: { 'en-IN': '/', 'en-US': '/' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE.url,
    siteName: 'Step To Soft',
    title: 'Step To Soft — Web Development, Software Engineering & IT Services',
    description:
      'Custom software, MERN stack, React.js & Node.js development. Mobile apps, UI/UX design & digital transformation — built in Asansol, shipping worldwide since 2018.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Step To Soft — Software Engineering & Web Development Company',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@steptosoft',
    creator: '@steptosoft',
    title: 'Step To Soft — Web Development, Software Engineering & IT Services',
    description:
      'Custom software, MERN stack, React.js & Node.js development. Mobile apps, UI/UX design & digital transformation.',
    images: [{ url: '/opengraph-image', alt: 'Step To Soft' }],
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
      { url: '/logo3.png', type: 'image/png', sizes: '32x32' },
      { url: '/logo3.png', type: 'image/png', sizes: '16x16' },
    ],
    shortcut: '/logo3.png',
    apple: { url: '/logo3.png', sizes: '180x180', type: 'image/png' },
  },
  verification: {
    // Add your Google Search Console HTML-tag ID here
    google: process.env.NEXT_PUBLIC_GSC_ID,
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const isAdmin = (headersList.get('x-pathname') ?? '').startsWith('/admin');

  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
    >
      <head>
        <ThemeScript />
        {/* Preconnect to external origins used at render time */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body>
        <GoogleAnalytics />
        {isAdmin ? (
          children
        ) : (
          <>
            {/* Global structured data — present on every public page */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationSchema()) }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebSiteSchema()) }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLocalBusinessSchema()) }}
            />
            <a href="#main" className="skip-link">
              Skip to content
            </a>
            <ThemeProvider>
              <Nav />
              <main id="main">{children}</main>
              <Footer />
            </ThemeProvider>
          </>
        )}
      </body>
    </html>
  );
}
