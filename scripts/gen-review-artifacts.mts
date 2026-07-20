/**
 * Generates pre-merge review artifacts for every template × mode.
 *
 *   npx tsx scripts/gen-review-artifacts.mts
 *
 * Output → resume-review/
 *   <template>-<mode>.pdf         the exported document
 *   <template>-<mode>-p1.png ...  every page at full A4 resolution
 *
 * Premium (react-pdf) templates export real text PDFs. Legacy HTML templates
 * are rendered through react-dom/server and captured/printed with headless
 * Chrome — note that the app's own legacy export is html2canvas (image-based),
 * so the real download is a raster of the same layout.
 *
 * Legacy templates have no mode support: their "client" variant here is the
 * same layout fed a PII-stripped record, with no logo/footer framing.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import * as PdfDocMod from '../src/components/resume/pdf/ResumePdfDocument';
import * as HtmlDocMod from '../src/components/resume/ResumeDocument';
import { RESUME_TEMPLATES } from '../src/components/resume/templateMeta';
import type { AdminResume, ResumeMode } from '../src/lib/adminApi';

const pick = (m: unknown) => {
  const inner = ((m as { default?: unknown }).default ?? m) as { default?: unknown };
  return (typeof inner === 'function' ? inner : inner.default) as React.ComponentType<any>;
};
const ResumePdfDocument = pick(PdfDocMod);
const ResumeDocument = pick(HtmlDocMod);

const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (o: { data: Buffer }) => {
    getScreenshot(o?: { scale?: number }): Promise<{ pages: { data: Buffer | Uint8Array }[] }>;
    destroy(): Promise<void>;
  };
};

const LOGO = `data:image/png;base64,${fs.readFileSync(path.resolve('public/logo3.png')).toString('base64')}`;

/** Deliberately long enough to span pages so page breaks are reviewable. */
const RESUME = {
  _id: 'review', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z',
  fullName: 'Shams Alam Ansari', headline: 'Senior Full Stack Developer',
  email: 'shams.ansari@example.com', phone: '+91 90000 11111', location: 'Asansol, West Bengal, India',
  website: 'https://shams.dev', linkedin: 'linkedin.com/in/shams-ansari', github: 'github.com/shams-ansari',
  summary:
    'Results-driven Full Stack Developer with 5+ years of experience designing, developing and deploying scalable web and mobile applications. Proficient in React.js, Next.js, Node.js and MongoDB, with a track record of shipping production systems for healthcare, real-estate and enterprise clients.',
  skills: ['React', 'Next.js', 'Redux', 'Tailwind CSS', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'Redis', 'AWS', 'Docker', 'Kubernetes', 'Java', 'Python', 'Git', 'Jira', 'Postman', 'Figma'],
  skillCategories: [],
  yearsOfExperience: 5, availability: 'Immediate', englishLevel: 'Professional (C1)',
  noticePeriod: '30 days', currentLocation: 'Asansol, India', preferredTimeZone: 'IST (UTC+5:30) · overlaps EST',
  primaryTechStack: ['React', 'Next.js', 'Node.js', 'MongoDB'],
  coreCompetencies: ['System Design', 'API Architecture', 'Code Review', 'Mentoring', 'Agile Delivery'],
  achievements: [
    'Reduced p95 API latency by 42% across the client platform.',
    'Mentored six junior engineers to independent feature delivery.',
    'Introduced CI checks that cut regression escapes by a third.',
  ],
  interests: ['Open source', 'Chess', 'Long-distance running'],
  references: [{ name: 'Naheed Zakia', designation: 'Engineering Manager', company: 'Step To Soft', contact: 'refs@steptosoft.com' }],
  experience: [
    {
      company: 'Step To Soft Pvt. Ltd.', role: 'Senior Full Stack Developer', location: 'Asansol, India',
      startDate: 'Jan 2023', endDate: '', current: true, employmentType: 'Full-time',
      description: 'Own the platform team delivering client-facing MERN products end to end.',
      technologies: ['React', 'Next.js', 'Node.js', 'MongoDB', 'AWS'],
      responsibilities: [
        'Designed and shipped a multi-tenant architecture serving 40k monthly users.',
        'Built RESTful APIs with Node.js and Express and integrated them with React front ends.',
        'Implemented JWT authentication and role-based authorization across services.',
        'Optimised application performance, scalability and SEO for client deliverables.',
      ],
      achievements: ['Cut infrastructure spend 30% by consolidating redundant services.'],
    },
    {
      company: 'XYZ Tech Solutions', role: 'Full Stack Developer', location: 'Kolkata, India',
      startDate: 'Jun 2021', endDate: 'Dec 2022', current: false, employmentType: 'Full-time',
      description: 'Delivered frontend and backend features for enterprise clients.',
      technologies: ['React', 'Node.js', 'MongoDB'],
      responsibilities: [
        'Developed responsive interfaces with React, Bootstrap and modern CSS.',
        'Integrated MongoDB and implemented CRUD operations across modules.',
        'Fixed defects and improved application performance in legacy areas.',
      ],
      achievements: ['Reduced page load time by 1.4s on the primary customer portal.'],
    },
  ],
  projects: [
    {
      name: 'DealOnProperty — Real Estate Platform', description: 'A full-featured platform where users buy, sell and rent properties.',
      link: '', technologies: ['Next.js', 'Node.js', 'MongoDB', 'Tailwind CSS', 'JWT'],
      role: 'Lead Developer', duration: 'Jan 2024 – Jun 2024',
      liveUrl: 'https://dealonproperty.com', repoUrl: 'https://github.com/shams-ansari/dealonproperty',
      responsibilities: ['Implemented property listing, search filters and payment integration.', 'Built the admin moderation dashboard.'],
      highlights: ['Scaled to 10k monthly active users within two quarters.'],
    },
    {
      name: 'Marengo Asia Hospitals', description: 'Hospital website with appointment booking and department management.',
      link: '', technologies: ['Next.js', 'React', 'Node.js', 'Bootstrap'],
      role: 'Developer', duration: '2023', liveUrl: 'https://marengoasia.example', repoUrl: '',
      responsibilities: ['Built enquiry, appointment and department modules.'], highlights: [],
    },
  ],
  education: [
    { institution: 'Asansol Engineering College', degree: 'B.Tech', field: 'Computer Science', startDate: '2016', endDate: '2020', grade: '8.6 CGPA' },
    { institution: 'West Bengal Council of HS Education', degree: 'Higher Secondary', field: 'Science', startDate: '2014', endDate: '2016', grade: '62%' },
  ],
  certifications: [
    { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', date: '2024' },
    { name: 'React — Advanced Patterns', issuer: 'Meta', date: '2023' },
  ],
  languages: ['English', 'Hindi', 'Bengali'],
  template: 'corporate-sidebar', resumeMode: 'employee',
} as unknown as AdminResume;

/** Legacy templates know nothing about modes — strip PII manually to preview it. */
const MASKED = {
  ...RESUME,
  email: '', phone: '', location: '', website: '', linkedin: '', github: '',
  photoUrl: '', interests: [], references: [],
} as unknown as AdminResume;

const OUT = path.resolve('resume-review');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const MODES: ResumeMode[] = ['employee', 'client'];
const manifest: string[] = [];

/* ── Premium (react-pdf) ─────────────────────────────────────────────────── */
for (const meta of RESUME_TEMPLATES.filter((t) => t.engine === 'pdf')) {
  for (const mode of MODES) {
    const buf = await renderToBuffer(
      React.createElement(ResumePdfDocument, {
        resume: RESUME, mode, template: meta.id, branding: { logoUrl: LOGO },
      })
    );
    const pdfPath = path.join(OUT, `${meta.id}-${mode}.pdf`);
    fs.writeFileSync(pdfPath, buf);

    const parser = new PDFParse({ data: buf });
    try {
      const shot = await parser.getScreenshot({ scale: 2.5 }); // ≈180 dpi A4
      shot.pages.forEach((p, i) => {
        fs.writeFileSync(path.join(OUT, `${meta.id}-${mode}-p${i + 1}.png`), Buffer.from(p.data));
      });
      manifest.push(`${meta.id}-${mode}: ${shot.pages.length} page(s), ${Math.round(buf.length / 1024)}KB PDF`);
    } finally {
      await parser.destroy();
    }
  }
}

/* ── Legacy (HTML) ───────────────────────────────────────────────────────── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'review-'));
const htmlJobs: { id: string; mode: ResumeMode; file: string }[] = [];
for (const meta of RESUME_TEMPLATES.filter((t) => t.engine === 'html')) {
  for (const mode of MODES) {
    const markup = renderToStaticMarkup(
      React.createElement(ResumeDocument, { resume: mode === 'client' ? MASKED : RESUME, template: meta.id })
    );
    const file = path.join(tmp, `${meta.id}-${mode}.html`);
    fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8">
      <style>body{margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif}</style>
      </head><body>${markup}</body></html>`);
    htmlJobs.push({ id: meta.id, mode, file });
  }
}

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
if (!CHROME) { console.error('No Chrome found — legacy artifacts skipped.'); process.exit(0); }

const PORT = 9271;
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const getJSON = (p: string): Promise<any> => new Promise((res, rej) => {
  http.get(`http://localhost:${PORT}${p}`, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))); }).on('error', rej);
});

let target: any;
for (let i = 0; i < 24; i++) {
  try { target = (await getJSON('/json')).find((t: any) => t.type === 'page'); if (target) break; } catch { /* starting */ }
  await sleep(500);
}
if (!target) { chrome.kill(); console.error('Chrome did not start.'); process.exit(1); }

const sock = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pend = new Map<number, (v: any) => void>();
const send = (method: string, params: object = {}) =>
  new Promise<any>((r) => { const i = ++id; pend.set(i, r); sock.send(JSON.stringify({ id: i, method, params })); });
sock.addEventListener('message', (e: any) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)!(m.result); pend.delete(m.id); }
});
await new Promise((r) => sock.addEventListener('open', r));
await send('Page.enable');

for (const job of htmlJobs) {
  await send('Emulation.setDeviceMetricsOverride', { width: 794, height: 1123, deviceScaleFactor: 2, mobile: false });
  await send('Page.navigate', { url: pathToFileURL(job.file).href });
  await sleep(1400);

  // Full-height capture so multi-page content is reviewable in one image.
  const metrics = await send('Page.getLayoutMetrics');
  const h = Math.max(1123, Math.ceil(metrics.contentSize?.height ?? 1123));
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 794, height: h, scale: 2 } });
  fs.writeFileSync(path.join(OUT, `${job.id}-${job.mode}-p1.png`), Buffer.from(shot.data, 'base64'));

  // Vector PDF of the same layout (the app's own legacy export is a raster).
  const pdf = await send('Page.printToPDF', { printBackground: true, paperWidth: 8.27, paperHeight: 11.69, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
  fs.writeFileSync(path.join(OUT, `${job.id}-${job.mode}.pdf`), Buffer.from(pdf.data, 'base64'));
  manifest.push(`${job.id}-${job.mode}: html capture ${794 * 2}×${h * 2}px`);
}

sock.close(); chrome.kill();
fs.rmSync(tmp, { recursive: true, force: true });

console.log(manifest.join('\n'));
console.log(`\n${fs.readdirSync(OUT).length} files in resume-review/`);
