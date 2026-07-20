/**
 * Regenerates template thumbnails into public/resume-templates/.
 *
 *   npx tsx scripts/gen-resume-thumbnails.mts
 *
 * PDF templates are rasterised straight from a real render, so a thumbnail can
 * never drift from what the template actually produces. HTML templates are
 * captured separately (see the note at the bottom).
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import * as DocMod from '../src/components/resume/pdf/ResumePdfDocument';
import { RESUME_TEMPLATES } from '../src/components/resume/templateMeta';
import type { AdminResume } from '../src/lib/adminApi';

const inner = ((DocMod as unknown as { default?: unknown }).default ?? DocMod) as { default?: unknown };
const ResumePdfDocument = (typeof inner === 'function' ? inner : inner.default) as React.ComponentType<{
  resume: AdminResume; mode?: 'employee' | 'client'; template?: string;
  branding?: { logoUrl?: string };
}>;

// Outside the browser a site-relative logo path can't resolve and react-pdf
// treats a filesystem path as a URL, so inline the asset as a data URI.
const LOGO_DATA_URI = `data:image/png;base64,${fs.readFileSync(path.resolve('public/logo3.png')).toString('base64')}`;

const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (o: { data: Buffer }) => {
    getScreenshot(o?: { scale?: number; pages?: number[] }): Promise<{ pages: { data: Buffer | Uint8Array }[] }>;
    destroy(): Promise<void>;
  };
};

/** Representative content so thumbnails look like a real resume. */
const SAMPLE = {
  _id: 'sample', createdAt: '', updatedAt: '',
  fullName: 'Shams Alam Ansari', headline: 'Senior Full Stack Developer',
  email: 'shams@example.com', phone: '+91 90000 11111', location: 'Asansol, India',
  website: 'shams.dev', linkedin: 'linkedin.com/in/shams', github: 'github.com/shams',
  summary: 'Results-driven Full Stack Developer with 5+ years building scalable web and mobile applications across React, Next.js and Node.js.',
  skills: ['React', 'Next.js', 'Redux', 'Tailwind CSS', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Java', 'Git', 'Jira'],
  skillCategories: [], yearsOfExperience: 5, availability: 'Immediate', englishLevel: 'Professional',
  noticePeriod: '30 days', currentLocation: 'Asansol, India', preferredTimeZone: 'IST (UTC+5:30)',
  primaryTechStack: ['React', 'Node.js', 'MongoDB'],
  coreCompetencies: ['System Design', 'API Architecture', 'Mentoring'],
  achievements: ['Reduced p95 API latency by 42%'], interests: ['Open source'], references: [],
  experience: [{
    company: 'Step To Soft Pvt. Ltd.', role: 'Senior Full Stack Developer', location: 'Asansol, India',
    startDate: 'Jan 2023', endDate: '', current: true, employmentType: 'Full-time',
    description: 'Own the platform team delivering client-facing MERN products.',
    technologies: ['React', 'Next.js', 'Node.js'],
    responsibilities: ['Designed multi-tenant architecture serving 40k monthly users', 'Built RESTful APIs integrated with React front ends'],
    achievements: ['Cut infrastructure spend 30%'],
  }],
  projects: [{
    name: 'DealOnProperty — Real Estate Platform', description: 'Buy, sell and rent properties at scale.',
    link: '', technologies: ['Next.js', 'MongoDB'], role: 'Lead Developer', duration: 'Jan – Jun 2024',
    liveUrl: 'https://dealonproperty.com', repoUrl: '',
    responsibilities: ['Implemented listings, search filters and payments'], highlights: ['10k monthly active users'],
  }],
  education: [{ institution: 'Asansol Engineering College', degree: 'B.Tech', field: 'Computer Science', startDate: '2016', endDate: '2020', grade: '8.6 CGPA' }],
  certifications: [{ name: 'AWS Certified Cloud Practitioner', issuer: 'AWS', date: '2024' }],
  languages: ['English', 'Hindi'], template: 'executive-professional', resumeMode: 'employee',
} as unknown as AdminResume;

const OUT = path.resolve('public/resume-templates');
fs.mkdirSync(OUT, { recursive: true });

for (const meta of RESUME_TEMPLATES.filter((t) => t.engine === 'pdf')) {
  // Client-capable templates are shown in client mode so the card previews the
  // branded resource profile (the primary enterprise use case).
  const mode = meta.recommendedFor.includes('Client') ? 'client' : 'employee';
  const buf = await renderToBuffer(
    React.createElement(ResumePdfDocument, {
      resume: SAMPLE, mode, template: meta.id,
      branding: { logoUrl: LOGO_DATA_URI },
    })
  );

  const parser = new PDFParse({ data: buf });
  try {
    const shot = await parser.getScreenshot({ scale: 1.4, pages: [1] });
    const img = shot.pages[0]?.data;
    if (!img) throw new Error('no page image');
    const file = path.join(OUT, `${meta.id}.png`);
    fs.writeFileSync(file, Buffer.from(img));
    console.log(`✓ ${meta.id}.png  ${Math.round(fs.statSync(file).size / 1024)}KB`);
  } finally {
    await parser.destroy();
  }
}

console.log('\nHTML templates (classic/modern/minimal) are captured from the browser preview —');
console.log('see scripts/gen-html-thumbnails.mts.');
