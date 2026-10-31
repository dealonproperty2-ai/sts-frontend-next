import fs from 'fs';
import path from 'path';
import React from 'react';
import { describe, expect, it } from 'vitest';
import {
  article, buildInternshipLetter, formatLetterDate, formatPeriodDate, generatedParagraphs, isValidLogoData, joinList,
  markupToRuns, normalizeInternshipInput, runsToMarkup, splitTechnologies, validateInternshipInput, BRAND,
  type InternshipLetterInput,
} from '@/lib/internshipLetter';

const raw = {
  salutation: 'Mr.', internName: '  Zedan   Ejaz ', relation: 'S/o', guardianSalutation: 'Mr.', guardianName: 'Mohammed Ejaz Alam',
  internshipType: 'Paid Internship', role: 'Software Developer Intern', startDate: '2026-01-05', endDate: '2026-06-30', letterDate: '2026-06-30',
  dateStyle: 'month', workSummary: '', technologies: 'React.js, Next.js, JavaScript, HTML, CSS, Bootstrap', performance: 'satisfactory',
};
const good = () => normalizeInternshipInput(raw);
const runsText = (r: { text: string }[]) => r.map((x) => x.text).join('');
const paras = (i: InternshipLetterInput) => buildInternshipLetter(i).paragraphs.map(runsText);

describe('internship letter — wording (matches the reference)', () => {
  it('reproduces the reference letter text', () => {
    expect(paras(good())).toEqual([
      'This is to certify that Mr. ZEDAN EJAZ, S/o Mr. MOHAMMED EJAZ ALAM, has successfully completed his Paid Internship as a Software Developer Intern at Step To Soft Pvt. Ltd. from January 2026 to June 2026.',
      'During the internship period, he worked on various software development projects and gained practical experience in React.js, Next.js, JavaScript, HTML, CSS, and Bootstrap. He performed his assigned responsibilities with dedication, sincerity, and professionalism.',
      'His overall performance, conduct, and commitment towards work were found to be satisfactory throughout the internship.',
      'We appreciate his contribution to the organization and wish him every success in his future career.',
    ]);
    const c = buildInternshipLetter(good());
    expect(c).toMatchObject({ letterDate: '30 June 2026', title: 'INTERNSHIP EXPERIENCE LETTER', subject: 'TO WHOM IT MAY CONCERN', forCompany: 'For STEP TO SOFT PVT. LTD.',
      signatory: { name: '', title: 'Human Resource Department', subtitle: 'Authorized Signatory' } });
  });

  it('bolds the names, role and period like the reference', () => {
    const bold = generatedParagraphs(good()).intro.filter((r) => r.bold).map((r) => r.text);
    expect(bold).toEqual(['ZEDAN EJAZ', 'MOHAMMED EJAZ ALAM', 'Software Developer Intern', 'January 2026', 'June 2026']);
  });

  it('uses the chosen pronouns throughout (she / they)', () => {
    const she = paras(normalizeInternshipInput({ ...raw, salutation: 'Ms.', relation: 'D/o', pronoun: undefined })).join(' ');
    expect(she).toContain('completed her Paid Internship');
    expect(she).toContain('She performed her assigned');
    expect(she).toContain('wish her every success in her future career');
    expect(she).not.toMatch(/\b(he|his|him)\b/i);
    const they = paras(normalizeInternshipInput({ ...raw, salutation: '', relation: '', pronoun: 'they' })).join(' ');
    expect(they).toContain('This is to certify that ZEDAN EJAZ, has successfully completed their');
    expect(they).toContain('They performed their assigned');
    expect(they).toContain('wish them every success in their future career');
  });

  it('adapts to optional data: no technologies, day-precise dates, remarks, other rating', () => {
    const t = paras(normalizeInternshipInput({ ...raw, technologies: '', dateStyle: 'day', remarks: 'He also mentored **two** juniors.', performance: 'excellent', workSummary: 'the company LMS and client portals' }));
    expect(t[0]).toContain('from 05 January 2026 to 30 June 2026.');
    expect(t[1]).toContain('worked on the company LMS and client portals and gained valuable practical experience.');
    expect(t[2]).toContain('found to be excellent throughout');
    expect(t[3]).toBe('He also mentored two juniors.');
    expect(t).toHaveLength(5);
  });

  it('uses edited wording with **bold** markup instead of the generated paragraph', () => {
    const c = buildInternshipLetter(normalizeInternshipInput({ ...raw, closingText: 'We wish **Zedan** all the best.' }));
    expect(c.paragraphs[c.paragraphs.length - 1]).toEqual([{ text: 'We wish ' }, { text: 'Zedan', bold: true }, { text: ' all the best.' }]);
    const intro = generatedParagraphs(good()).intro;
    const back = markupToRuns(runsToMarkup(intro));
    expect(runsText(back)).toBe(runsText(intro));
    expect(back.filter((r) => r.bold).map((r) => r.text)).toEqual(intro.filter((r) => r.bold).map((r) => r.text));
    expect(markupToRuns('a ** b')).toEqual([{ text: 'a ** b' }]);
  });

  it('never renders undefined, null, NaN or HTML entities', () => {
    const t = paras(normalizeInternshipInput({ ...raw, relation: '', guardianName: '', technologies: '', internshipType: '' })).join(' ');
    expect(t).not.toMatch(/undefined|null|NaN|&amp;|&#\d+;/);
    expect(t).toContain('completed his Internship as a Software Developer Intern');
  });
});

describe('internship letter — helpers', () => {
  it('formats dates', () => {
    expect(formatLetterDate('2026-06-30')).toBe('30 June 2026');
    expect(formatLetterDate('2026-06-05')).toBe('5 June 2026');
    expect(formatPeriodDate('2026-01-05', 'month')).toBe('January 2026');
    expect(formatPeriodDate('2026-01-05', 'day')).toBe('05 January 2026');
    expect(formatLetterDate('')).toBe('');
  });

  it('joins lists with a serial comma and de-duplicates technologies', () => {
    expect(joinList(['A'])).toBe('A');
    expect(joinList(['A', 'B'])).toBe('A and B');
    expect(joinList(['A', 'B', 'C'])).toBe('A, B, and C');
    expect(splitTechnologies(' React.js ; react.js,Node.js\nSQL,, ')).toEqual(['React.js', 'Node.js', 'SQL']);
  });

  it('picks the article by sound', () => {
    expect(article('Software Developer Intern')).toBe('a');
    expect(article('Intern')).toBe('an');
    expect(article('Android Developer Intern')).toBe('an');
    expect(article('UI/UX Designer Intern')).toBe('a');
    expect(article('HR Intern')).toBe('an');
    expect(article('SEO Analyst Intern')).toBe('an');
    expect(article('Unpaid Trainee')).toBe('an');
    expect(article('University Relations Intern')).toBe('a');
  });

  it('derives the letterhead from the company configuration', () => {
    expect(BRAND.name).toBe('STEP TO SOFT PVT. LTD.');
    expect(`${BRAND.addressLine1}, ${BRAND.addressLine2}`).toBe(BRAND.address);
  });
});

describe('internship letter — validation', () => {
  const v = (over: Record<string, unknown>) => validateInternshipInput(normalizeInternshipInput({ ...raw, ...over }), { ...raw, ...over });

  it('accepts the reference data', () => {
    expect(v({})).toEqual({});
  });

  it('requires the essentials', () => {
    const e = validateInternshipInput(normalizeInternshipInput({}));
    for (const k of ['internName', 'role', 'startDate', 'endDate', 'letterDate']) expect(e[k], k).toBeTruthy();
  });

  it('checks date order and invalid dates', () => {
    expect(v({ endDate: '2025-12-31' }).endDate).toMatch(/before the start date/);
    expect(v({ letterDate: '2026-06-01' }).letterDate).toMatch(/on or after the internship end date/);
    expect(v({ startDate: '2026-13-45' }).startDate).toMatch(/not a valid date/);
    expect(v({ startDate: '2026-02-30' }).startDate).toMatch(/not a valid date/);
  });

  it('checks names, guardian, role and technologies', () => {
    expect(v({ internName: '<script>' }).internName).toBeTruthy();
    expect(v({ guardianName: '' }).guardianName).toMatch(/S\/o/);
    expect(v({ relation: '', guardianName: '' })).toEqual({});
    expect(v({ relation: '' }).relation).toMatch(/Choose S\/o/); // a guardian name is never silently dropped
    expect(v({ role: '!!!' }).role).toBeTruthy();
    expect(v({ technologies: Array.from({ length: 30 }, (_, i) => `T${i}`).join(',') }).technologies).toMatch(/at most/);
  });

  it('accepts only real PNG/JPEG logos', () => {
    const png = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString('base64')}`;
    const fakePng = `data:image/png;base64,${Buffer.from('<svg onload=alert(1)>').toString('base64')}`;
    expect(isValidLogoData(png)).toBe(true);
    expect(isValidLogoData(fakePng)).toBe(false);
    expect(isValidLogoData('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(v({ logoMode: 'custom', logoData: fakePng }).logoData).toBeTruthy();
    expect(v({ logoMode: 'custom', logoData: png })).toEqual({});
    expect(normalizeInternshipInput({ ...raw, logoMode: 'default', logoData: png }).logoData).toBe('');
  });
});

describe('internship letter — PDF', () => {
  it('renders a valid, text-based A4 PDF', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const { InternshipLetterDocument } = await import('@/lib/internshipLetterPdfDoc');
    const variants: Record<string, Record<string, unknown>> = {
      reference: {},
      long: {
        internName: 'Venkata Lakshmi Narasimha Subrahmanya Sastry Chakravarthula', guardianName: 'Srinivasa Ramanujan Iyengar Chakravarthula Venkataraman',
        role: 'Senior Full Stack Software Development and Cloud Infrastructure Intern',
        technologies: 'React.js, Next.js, TypeScript, Node.js, Express, MongoDB, PostgreSQL, Docker, Kubernetes, AWS, Git, Jest, Tailwind CSS',
        remarks: Array.from({ length: 8 }, () => 'He showed initiative in code reviews, documentation and mentoring of junior interns across projects.').join(' '),
        signatoryName: 'Naheed Zakia',
      },
    };
    for (const [name, over] of Object.entries(variants)) {
      const doc = React.createElement(InternshipLetterDocument, { content: buildInternshipLetter(normalizeInternshipInput({ ...raw, ...over })) });
      const buf = await renderToBuffer(doc as unknown as Parameters<typeof renderToBuffer>[0]);
      expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(buf.toString('latin1')).toMatch(/\/MediaBox \[0 0 595\.28\d* 841\.89\d*\]/); // A4
      if (process.env.PDF_OUT) fs.writeFileSync(path.join(process.env.PDF_OUT, `internship_${name}.pdf`), buf);
    }
  }, 60_000);
});
