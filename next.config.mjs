const isDev = process.env.NODE_ENV !== 'production';

// `next dev` (Fast Refresh + webpack eval devtool) requires 'unsafe-eval' and a
// websocket connection for HMR. Production bundles use neither, so we keep the
// policy strict there and only relax it in development.
const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  isDev ? "'unsafe-eval'" : '',
  'https://www.googletagmanager.com https://www.google-analytics.com',
]
  .filter(Boolean)
  .join(' ');

const connectSrc = [
  "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com",
  isDev ? 'ws: http://localhost:* ws://localhost:*' : '',
]
  .filter(Boolean)
  .join(' ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // @react-pdf/renderer ships ESM-only; without this the bundler throws
  // "ESM packages need to be imported" and the whole resume view fails.
  transpilePackages: ['@react-pdf/renderer'],
  // Lets a build run into an isolated directory (NEXT_DIST_DIR=.next-analyze)
  // so CI/bundle analysis never clobbers a running dev server's .next cache.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: 'steptosoft.com' },
    ],
  },

  async headers() {
    return [
      // ── Security + SEO headers on all routes ──────────────────────────────
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Allow GA4 and Google Tag Manager scripts
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https:",
              connectSrc,
              "frame-src 'self' https://www.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },

      // ── Admin: no indexing, strict framing ───────────────────────────────
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },

      // ── Long-lived caching for static assets ─────────────────────────────
      {
        source: '/team/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|gif|woff2|woff|ttf|otf)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },

      // ── Sitemap / robots: short-lived so updates propagate fast ──────────
      {
        source: '/sitemap.xml',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' }],
      },
      {
        source: '/robots.txt',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400' }],
      },

      // ── API: no caching by default ───────────────────────────────────────
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },

  async redirects() {
    return [
      // Normalise trailing slashes to canonical form without slash
      { source: '/services/', destination: '/services', permanent: true },
      { source: '/about/', destination: '/about', permanent: true },
      { source: '/courses/', destination: '/courses', permanent: true },
      { source: '/careers/', destination: '/careers', permanent: true },
      { source: '/contact/', destination: '/contact', permanent: true },
    ];
  },
};

export default nextConfig;
