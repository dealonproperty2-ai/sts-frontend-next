import type { MetadataRoute } from 'next';
import { connectDb } from '@/server/db';
import Course from '@/server/models/Course';

const SITE_URL = process.env.SITE_URL || 'https://steptosoft.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  let courseRoutes: MetadataRoute.Sitemap = [];
  try {
    await connectDb();
    const courses = await Course.find({ isActive: true }).select('slug tag updatedAt').lean();
    courseRoutes = courses.map((c) => ({
      url: `${SITE_URL}/courses/${c.slug}`,
      lastModified: c.updatedAt ?? now,
      changeFrequency: 'monthly',
      priority: c.tag === 'Flagship' ? 0.9 : 0.7,
    }));
  } catch {
    // Fall back to known slugs if DB is unreachable at build time
    courseRoutes = ['webdev', 'frontend', 'backend', 'angular', 'devops', 'qa'].map((slug) => ({
      url: `${SITE_URL}/courses/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: slug === 'webdev' ? 0.9 : 0.7,
    }));
  }

  return [...staticRoutes, ...courseRoutes];
}
