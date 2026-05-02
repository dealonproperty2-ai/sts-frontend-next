import type { MetadataRoute } from 'next';
import { COURSES } from '@/lib/courses';

const SITE_URL = process.env.SITE_URL || 'https://steptosoft.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/courses`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/careers`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const courseRoutes: MetadataRoute.Sitemap = COURSES.map((c) => ({
    url: `${SITE_URL}/courses/${c.id}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: c.tag === 'Flagship' ? 0.9 : 0.7,
  }));

  return [...staticRoutes, ...courseRoutes];
}
