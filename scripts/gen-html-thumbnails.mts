/**
 * Thumbnails for the legacy HTML templates (classic / modern / minimal).
 *
 *   npx tsx scripts/gen-html-thumbnails.mts
 *
 * Renders ResumeDocument to static markup and screenshots it with headless
 * Chrome — no dev server or auth required. Chrome must be installed.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as DocMod from '../src/components/resume/ResumeDocument';
import { RESUME_TEMPLATES } from '../src/components/resume/templateMeta';
import type { AdminResume } from '../src/lib/adminApi';

const inner = ((DocMod as unknown as { default?: unknown }).default ?? DocMod) as { default?: unknown };
const ResumeDocument = (typeof inner === 'function' ? inner : inner.default) as React.ComponentType<{
  resume: AdminResume; template?: string; id?: string;
}>;

const SAMPLE = {
  _id: 's', createdAt: '', updatedAt: '',
  fullName: 'Shams Alam Ansari', headline: 'Senior Full Stack Developer',
  email: 'shams@example.com', phone: '+91 90000 11111', location: 'Asansol, India',
  website: 'shams.dev', linkedin: 'linkedin.com/in/shams', github: 'github.com/shams',
  summary: 'Results-driven Full Stack Developer with 5+ years building scalable web and mobile applications across React, Next.js and Node.js.',
  skills: ['React', 'Next.js', 'Node.js', 'MongoDB', 'AWS', 'Docker'],
  skillCategories: [
    { label: 'Frontend', items: ['React', 'Next.js', 'Redux'] },
    { label: 'Backend', items: ['Node.js', 'Express'] },
    { label: 'Database', items: ['MongoDB', 'PostgreSQL'] },
  ],
  experience: [{
    company: 'Step To Soft Pvt. Ltd.', role: 'Senior Full Stack Developer', location: 'Asansol, India',
    startDate: 'Jan 2023', endDate: '', current: true,
    description: 'Own the platform team delivering client-facing MERN products.',
  }],
  projects: [{ name: 'DealOnProperty', description: 'Real estate platform at scale.', link: 'https://dealonproperty.com', technologies: ['Next.js', 'MongoDB'] }],
  education: [{ institution: 'Asansol Engineering College', degree: 'B.Tech', field: 'Computer Science', startDate: '2016', endDate: '2020', grade: '8.6 CGPA' }],
  certifications: [{ name: 'AWS Certified Cloud Practitioner', issuer: 'AWS', date: '2024' }],
  languages: ['English', 'Hindi'], template: 'classic', resumeMode: 'employee',
} as unknown as AdminResume;

const OUT = path.resolve('public/resume-templates');
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'thumbs-'));

const htmlTemplates = RESUME_TEMPLATES.filter((t) => t.engine === 'html');
const pages: { id: string; file: string }[] = [];

for (const meta of htmlTemplates) {
  const markup = renderToStaticMarkup(
    React.createElement(ResumeDocument, { resume: SAMPLE, template: meta.id })
  );
  const file = path.join(tmp, `${meta.id}.html`);
  fs.writeFileSync(
    file,
    `<!doctype html><html><head><meta charset="utf-8">
     <style>body{margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif}</style>
     </head><body>${markup}</body></html>`
  );
  pages.push({ id: meta.id, file });
}

// ── headless Chrome ─────────────────────────────────────────────────────────
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
if (!CHROME) { console.error('No Chrome/Edge found — skipping HTML thumbnails.'); process.exit(0); }

const PORT = 9261;
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function getJSON(p: string): Promise<any> {
  return new Promise((res, rej) => {
    http.get(`http://localhost:${PORT}${p}`, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))); }).on('error', rej);
  });
}

let target: any;
for (let i = 0; i < 20; i++) {
  try { target = (await getJSON('/json')).find((t: any) => t.type === 'page'); if (target) break; } catch { /* not up yet */ }
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
await send('Emulation.setDeviceMetricsOverride', { width: 794, height: 1123, deviceScaleFactor: 1.4, mobile: false });

for (const p of pages) {
  await send('Page.navigate', { url: pathToFileURL(p.file).href });
  await sleep(1200);
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 794, height: 1123, scale: 1.4 } });
  const out = path.join(OUT, `${p.id}.png`);
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(`✓ ${p.id}.png  ${Math.round(fs.statSync(out).size / 1024)}KB`);
}

sock.close();
chrome.kill();
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(0);
