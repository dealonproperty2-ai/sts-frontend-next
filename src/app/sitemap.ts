import type { MetadataRoute } from 'next';
import { connectDb } from '@/server/db';
import Course from '@/server/models/Course';

const SITE_URL = process.env.SITE_URL || 'https://steptosoft.com';

// Ordered by SEO priority — highest-value pages first.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date('2026-05-27'),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/services`,
      lastModified: new Date('2026-05-27'),
      changeFrequency: 'monthly',
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/courses`,
      lastModified: new Date('2026-05-27'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date('2026-05-01'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date('2026-05-27'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/careers`,
      lastModified: new Date('2026-05-27'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date('2025-12-01'),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date('2025-12-01'),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  let courseRoutes: MetadataRoute.Sitemap = [];
  try {
    await connectDb();
    const courses = await Course.find({ isActive: true }).select('slug tag updatedAt').lean();
    courseRoutes = courses.map((c) => ({
      url: `${SITE_URL}/courses/${c.slug}`,
      lastModified: c.updatedAt ?? new Date('2026-05-01'),
      changeFrequency: 'monthly' as const,
      priority: c.tag === 'Flagship' ? 0.9 : 0.75,
    }));
  } catch {
    // Fall back to known slugs if DB is unreachable at build time
    courseRoutes = [
      { slug: 'webdev', priority: 0.9 },
      { slug: 'frontend', priority: 0.75 },
      { slug: 'backend', priority: 0.75 },
      { slug: 'angular', priority: 0.75 },
      { slug: 'devops', priority: 0.75 },
      { slug: 'qa', priority: 0.75 },
    ].map(({ slug, priority }) => ({
      url: `${SITE_URL}/courses/${slug}`,
      lastModified: new Date('2026-05-01'),
      changeFrequency: 'monthly' as const,
      priority,
    }));
  }

  return [...staticRoutes, ...courseRoutes];
}
