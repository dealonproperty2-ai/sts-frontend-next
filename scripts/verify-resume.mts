/**
 * Resume system verification.
 *
 *   npx tsx scripts/verify-resume.mts
 *
 * Asserts, for every pdf template in the registry:
 *  1. ATS text extraction (real text, not a raster image)
 *  2. No PII leaks into a client-mode file
 *  3. White-label branding is applied
 *  4. Resource-profile fields render in client mode
 *  5. Empty resumes produce no stray headings
 *  6. Long content paginates without losing entries
 * Plus: JSON export is mode-masked.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import * as DocMod from '../src/components/resume/pdf/ResumePdfDocument';
import { RESUME_TEMPLATES } from '../src/components/resume/templateMeta';
import { buildResumeView } from '../src/lib/resumeView';
import type { AdminResume } from '../src/lib/adminApi';

const inner = ((DocMod as unknown as { default?: unknown }).default ?? DocMod) as { default?: unknown };
const Doc = (typeof inner === 'function' ? inner : inner.default) as React.ComponentType<any>;

const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (o: { data: Buffer }) => {
    getText(): Promise<{ text: string; pages?: unknown[] }>;
    destroy(): Promise<void>;
  };
};
async function ats(buf: Buffer) {
  const p = new PDFParse({ data: buf });
  try { const r = await p.getText(); return { text: r.text.replace(/\s+/g, ' ').trim(), pages: r.pages?.length ?? 0 }; }
  finally { await p.destroy(); }
}

const PII = {
  email: 'riya.secret@example.com',
  phone: '+91 98765 43210',
  address: '221B Baker Street',
  website: 'riya-secret.dev',
  linkedin: 'linkedin.com/in/riya-secret',
  github: 'github.com/riya-secret',
};

const BRAND = {
  name: 'ACME TALENT LLP',
  logoUrl: '',
  website: 'acme-talent.example',
  tagline: 'Engineering talent, on demand',
  footerNote: 'Resource profile issued by Acme Talent.',
};

const FULL = {
  _id: 'x', createdAt: '', updatedAt: '',
  fullName: 'Riya Sharma', headline: 'Senior Full Stack Developer',
  email: PII.email, phone: PII.phone, location: PII.address,
  website: PII.website, linkedin: PII.linkedin, github: PII.github,
  summary: 'Full-stack engineer across React and Node.',
  skills: ['React', 'Node.js', 'MongoDB', 'AWS', 'Docker', 'Java', 'Jira'],
  skillCategories: [],
  yearsOfExperience: 6, availability: 'Immediate', englishLevel: 'Professional',
  noticePeriod: '30 days', currentLocation: 'Asansol, India', preferredTimeZone: 'IST (UTC+5:30)',
  primaryTechStack: ['React', 'Node.js'],
  coreCompetencies: ['System Design'], achievements: ['Cut latency 40%'],
  interests: ['Chess'], references: [{ name: 'Ref Person', designation: 'CTO', company: 'Acme', contact: 'ref@acme.com' }],
  experience: [{ company: 'Step To Soft', role: 'Senior Developer', location: 'Asansol', startDate: 'Jan 2023', endDate: '', current: true, description: 'Platform team.', employmentType: 'Full-time', technologies: ['Next.js'], responsibilities: ['Designed architecture'], achievements: ['Cut spend 30%'] }],
  projects: [{ name: 'DealOnProperty', description: 'Real estate.', link: '', technologies: ['Next.js'], role: 'Lead', duration: '2024', liveUrl: 'https://dealon.example', repoUrl: 'https://github.com/riya-secret/deal', responsibilities: ['Search'], highlights: ['10k MAU'] }],
  education: [{ institution: 'AEC', degree: 'B.Tech', field: 'CSE', startDate: '2016', endDate: '2020', grade: '8.6' }],
  certifications: [{ name: 'AWS CCP', issuer: 'AWS', date: '2024' }],
  languages: ['English'], template: 'executive-professional', resumeMode: 'employee',
} as unknown as AdminResume;

const results: string[] = []; const failed: string[] = [];
const check = (n: string, ok: boolean, extra = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${extra ? ' — ' + extra : ''}`);
  if (!ok) failed.push(n);
};

for (const meta of RESUME_TEMPLATES.filter(t => t.engine === 'pdf')) {
  const t = meta.id;

  const empBuf = await renderToBuffer(React.createElement(Doc, { resume: FULL, mode: 'employee', template: t }));
  const emp = await ats(empBuf);
  check(`[${t}] employee: ATS text extractable`, /Riya/.test(emp.text) && /React|Node/.test(emp.text));
  check(`[${t}] employee: no raster image layer`, !/\/Subtype\s*\/Image/.test(empBuf.toString('latin1')));
  check(`[${t}] employee: contact present`, emp.text.includes('riya.secret') || emp.text.includes('98765'));
  check(`[${t}] employee: size < 200KB`, empBuf.length < 200_000, `${Math.round(empBuf.length / 1024)}KB`);

  const cliBuf = await renderToBuffer(React.createElement(Doc, { resume: FULL, mode: 'client', template: t, branding: BRAND }));
  const cli = await ats(cliBuf);
  const raw = cliBuf.toString('latin1');
  const leaks = Object.entries(PII).filter(([, v]) => cli.text.includes(v) || raw.includes(v)).map(([k]) => k);
  check(`[${t}] client: ZERO PII in file`, leaks.length === 0, leaks.length ? `LEAKED ${leaks.join(', ')}` : 'all withheld');
  check(`[${t}] client: repo url stripped`, !raw.includes('riya-secret'));
  check(`[${t}] client: interests + references removed`, !cli.text.includes('Chess') && !cli.text.includes('Ref Person'));
  // Note: "Step To Soft" also appears legitimately as an employer name in the
  // sample, so assert on the branded attribution line specifically.
  check(
    `[${t}] client: white-label branding applied`,
    cli.text.includes('Prepared by ACME TALENT LLP') && !cli.text.includes('STEP TO SOFT PVT. LTD.')
  );
  check(`[${t}] client: branded footer note`, cli.text.includes('Acme Talent'));
  check(`[${t}] client: resource fields render`, ['30 days', 'IST', 'Asansol'].every(v => cli.text.includes(v)), 'notice/timezone/location');
  check(`[${t}] client: skills retained`, /React|Node/.test(cli.text));

  const empty = { _id: 'e', createdAt: '', updatedAt: '', fullName: '', skills: [], experience: [], education: [], projects: [], certifications: [], languages: [], template: t } as unknown as AdminResume;
  const emptyText = (await ats(await renderToBuffer(React.createElement(Doc, { resume: empty, template: t })))).text;
  check(`[${t}] empty: no stray headings`, !/EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|SKILLS|COMPETENC/i.test(emptyText));

  const long = { ...FULL, experience: Array.from({ length: 9 }, (_, i) => ({ ...(FULL as any).experience[0], company: `Company ${i + 1}`, responsibilities: Array.from({ length: 6 }, (_, j) => `Responsibility ${j + 1} for company ${i + 1} with a fairly long descriptive sentence.`) })) } as unknown as AdminResume;
  const longRes = await ats(await renderToBuffer(React.createElement(Doc, { resume: long, template: t })));
  check(`[${t}] long content paginates`, longRes.pages >= 2, `${longRes.pages} pages`);
  check(`[${t}] last entry survives pagination`, longRes.text.includes('Company 9'));
}

// JSON export must honour masking
const clientView = buildResumeView(FULL, 'client');
const json = JSON.stringify(clientView);
check('json export: mode-masked (no PII)', !Object.values(PII).some(v => json.includes(v)));
check('json export: keeps skills', /React/.test(json));

console.log(results.join('\n'));
console.log(failed.length ? `\n${failed.length} FAILURE(S)` : `\nALL ${results.length} CHECKS PASSED`);
process.exit(failed.length ? 1 : 0);
