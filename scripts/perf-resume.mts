/** PDF generation performance + memory. npx tsx scripts/perf-resume.mts */
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import * as M from '../src/components/resume/pdf/ResumePdfDocument';
import { RESUME_TEMPLATES } from '../src/components/resume/templateMeta';
import type { AdminResume } from '../src/lib/adminApi';

const inner = ((M as { default?: unknown }).default ?? M) as { default?: unknown };
const Doc = (typeof inner === 'function' ? inner : inner.default) as React.ComponentType<any>;

const base = {
  _id: 'p', createdAt: '', updatedAt: '', fullName: 'Shams Alam Ansari',
  headline: 'Senior Full Stack Developer', email: 'a@b.c', phone: '+91 90000 11111',
  location: 'Asansol', website: 'x.dev', linkedin: 'li', github: 'gh',
  summary: 'Full-stack engineer with a track record of shipping production systems.'.repeat(2),
  skills: ['React','Next.js','Redux','Tailwind CSS','Node.js','Express','MongoDB','PostgreSQL','AWS','Docker','Java','Git','Jira'],
  skillCategories: [], yearsOfExperience: 5, availability: 'Immediate', englishLevel: 'C1',
  noticePeriod: '30 days', currentLocation: 'Asansol', preferredTimeZone: 'IST',
  primaryTechStack: ['React','Node.js'], coreCompetencies: ['System Design','Mentoring'],
  achievements: ['Cut latency 42%'], interests: ['Chess'], references: [],
  education: [{ institution: 'AEC', degree: 'B.Tech', field: 'CSE', startDate: '2016', endDate: '2020', grade: '8.6' }],
  certifications: [{ name: 'AWS CCP', issuer: 'AWS', date: '2024' }],
  languages: ['English'], template: 'corporate-sidebar', resumeMode: 'employee',
} as unknown as AdminResume;

const exp = (n: number) => Array.from({ length: n }, (_, i) => ({
  company: `Company ${i + 1}`, role: 'Senior Developer', location: 'Asansol',
  startDate: 'Jan 2023', endDate: '', current: true, employmentType: 'Full-time',
  description: 'Owned platform delivery end to end.',
  technologies: ['React', 'Node.js'],
  responsibilities: Array.from({ length: 4 }, (_, j) => `Responsibility ${j + 1} with a reasonably long descriptive sentence for realism.`),
  achievements: ['Cut spend 30%'],
}));

async function time(label: string, fn: () => Promise<Buffer>, runs = 5) {
  await fn(); // warm-up (font registration, module init)
  const ts: number[] = [];
  let bytes = 0;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    const b = await fn();
    ts.push(performance.now() - t0);
    bytes = b.length;
  }
  ts.sort((a, b) => a - b);
  const med = ts[Math.floor(ts.length / 2)];
  console.log(`${label.padEnd(46)} median ${med.toFixed(0).padStart(5)}ms   p-min ${ts[0].toFixed(0)}ms  ${(bytes / 1024).toFixed(0)}KB`);
  return med;
}

console.log('PDF generation (Node, median of 5 runs after warm-up)\n');
for (const t of RESUME_TEMPLATES.filter(x => x.engine === 'pdf')) {
  for (const [name, count] of [['1 page', 1], ['~3 pages', 4], ['~8 pages', 12]] as const) {
    const resume = { ...base, experience: exp(count) } as unknown as AdminResume;
    await time(`${t.id} · ${name}`, () =>
      renderToBuffer(React.createElement(Doc, { resume, mode: 'client', template: t.id })));
  }
}

const mu = process.memoryUsage();
console.log(`\nheapUsed ${(mu.heapUsed / 1048576).toFixed(0)}MB   rss ${(mu.rss / 1048576).toFixed(0)}MB`);
