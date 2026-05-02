import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Step To Soft',
    short_name: 'STS',
    description:
      'Step To Soft — software engineering, SaaS, dedicated developer pods & a full-stack web bootcamp.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0d',
    theme_color: '#0a0a0d',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
