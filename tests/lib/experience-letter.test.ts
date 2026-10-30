import fs from 'fs';
import path from 'path';
import React from 'react';
import { describe, expect, it } from 'vitest';
import {
  buildExperienceLetter, formatElIssueDate, formatElPeriodDate, generatedExperience, normalizeExperienceInput, validateExperienceInput,
  type ExperienceLetterInput,
} from '@/lib/experienceLetter';
import { markupToRunsRl, runsToMarkupRl } from '@/lib/relievingLetter';

const raw = {
  salutation: 'Mr.', employeeName: '  Fauzan   Ejaz ', designation: 'Frontend Developer Intern', joiningDate: '2023-01-02',
  endDate: '2023-06-02', issueDate: '2023-06-02',
};
const good = () => normalizeExperienceInput(raw);
const runsText = (r: { text: string }[]) => r.map((x) => x.text).join('');
const all = (i: ExperienceLetterInput) => {
  const c = buildExperienceLetter(i);
  return { intro: runsText(c.intro), remarks: c.remarks && runsText(c.remarks), closing: runsText(c.closing) };
};

describe('experience letter — wording (matches the reference, corrected)', () => {
  it('reproduces the reference letter', () => {
    const c = buildExperienceLetter(good());
    expect(c).toMatchObject({ title: 'TO WHOM IT MAY CONCERN', issueDate: 'Jun 02nd, 2023', regards: 'Regards', remarks: null,
      signatory: { name: '', company: 'Step To Soft Pvt. Ltd.', department: 'Human Resource', title: 'Authorized Signatory' } });
    expect(all(good())).toEqual({
      intro: 'This is to certify that Mr. Fauzan Ejaz has worked as a Frontend Developer Intern from 02nd January 2023 to 02nd June 2023. During his service, his character and conduct were satisfactory.',
      remarks: null,
      closing: 'We wish him all success in his future endeavors.',
    });
  });

  it('bolds name, designation and the service period like the reference', () => {
    expect(generatedExperience(good()).intro.filter((r) => r.bold).map((r) => r.text))
      .toEqual(['Mr. Fauzan Ejaz', 'Frontend Developer Intern', '02nd January 2023 to 02nd June 2023']);
  });

  it('uses pronouns, rating, department, employee ID and articles', () => {
    const she = all(normalizeExperienceInput({ ...raw, salutation: 'Ms.', employeeName: 'Priya Sharma', rating: 'excellent', designation: 'HR Executive', department: 'Human Resources' }));
    expect(she.intro).toBe('This is to certify that Ms. Priya Sharma has worked as an HR Executive in the Human Resources department from 02nd January 2023 to 02nd June 2023. During her service, her character and conduct were excellent.');
    expect(she.closing).toBe('We wish her all success in her future endeavors.');
    const they = all(normalizeExperienceInput({ ...raw, salutation: '', employeeCode: 'STS0042', showEmployeeCode: true }));
    expect(they.intro).toContain('Fauzan Ejaz (Employee ID: STS0042) has worked as a');
    expect(they.intro).toContain('During their service, their character');
    expect(they.closing).toBe('We wish them all success in their future endeavors.');
  });

  it('adds performance remarks and edited wording', () => {
    const c = buildExperienceLetter(normalizeExperienceInput({ ...raw, remarks: 'He led the **React migration**.', closingText: 'Best wishes from the team.' }));
    expect(c.remarks).toEqual([{ text: 'He led the ' }, { text: 'React migration', bold: true }, { text: '.' }]);
    expect(runsText(c.closing)).toBe('Best wishes from the team.');
    const intro = generatedExperience(good()).intro;
    expect(runsText(markupToRunsRl(runsToMarkupRl(intro)))).toBe(runsText(intro));
  });

  it('never renders undefined, null or NaN', () => {
    const t = Object.values(all(normalizeExperienceInput({ ...raw, department: '' }))).join(' ');
    expect(t).not.toMatch(/undefined|NaN|&amp;/);
  });
});

describe('experience letter — dates and validation', () => {
  it('formats dates in the reference style', () => {
    expect(formatElIssueDate('2023-06-02')).toBe('Jun 02nd, 2023');
    expect(formatElPeriodDate('2023-01-02')).toBe('02nd January 2023');
    expect(formatElPeriodDate('2023-03-21')).toBe('21st March 2023');
    expect(formatElPeriodDate('2023-03-13')).toBe('13th March 2023');
    expect(formatElIssueDate('')).toBe('');
  });

  const v = (over: Record<string, unknown>) => validateExperienceInput(normalizeExperienceInput({ ...raw, ...over }), { ...raw, ...over });

  it('accepts valid data and requires the essentials', () => {
    expect(v({})).toEqual({});
    const e = validateExperienceInput(normalizeExperienceInput({}));
    for (const k of ['employeeName', 'designation', 'joiningDate', 'endDate', 'issueDate']) expect(e[k], k).toBeTruthy();
  });

  it('checks date order, impossible dates, names and images', () => {
    expect(v({ endDate: '2022-12-31' }).endDate).toMatch(/before the joining date/);
    expect(v({ issueDate: '2023-06-01' }).issueDate).toMatch(/on or after the last working date/);
    expect(v({ joiningDate: '2023-02-30' }).joiningDate).toMatch(/not a valid date/);
    expect(v({ employeeName: '<script>' }).employeeName).toBeTruthy();
    expect(v({ showEmployeeCode: true }).employeeCode).toBeTruthy();
    expect(v({ logoMode: 'custom', logoData: 'data:image/png;base64,AAAA' }).logoData).toBeTruthy();
    expect(normalizeExperienceInput({ ...raw, rating: 'awful' }).rating).toBe('satisfactory');
  });
});

describe('experience letter — PDF', () => {
  it('renders valid, text-based A4 PDFs (and paginates long letters)', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const { ExperienceLetterDocument } = await import('@/lib/experienceLetterPdfDoc');
    const sentence = 'He consistently delivered high-quality work, mentored new joiners and took ownership of releases across several client projects. ';
    const variants: Record<string, [Record<string, unknown>, number]> = {
      reference: [{}, 1],
      long: [{ employeeName: 'Venkata Lakshmi Narasimha Subrahmanya Sastry Chakravarthula', designation: 'Senior Principal Software Engineering Consultant (Platform & Reliability)',
        department: 'Engineering & Delivery', employeeCode: 'STS9200001', showEmployeeCode: true, rating: 'excellent', remarks: sentence.repeat(8), signatoryName: 'Naheed Zakia' }, 1],
      twopage: [{ remarks: sentence.repeat(12).slice(0, 1500), introText: `${runsToMarkupRl(generatedExperience(good()).intro)} ${sentence.repeat(12)}` }, 2],
    };
    for (const [name, [over, pages]] of Object.entries(variants)) {
      const doc = React.createElement(ExperienceLetterDocument, { content: buildExperienceLetter(normalizeExperienceInput({ ...raw, ...over })) });
      const buf = await renderToBuffer(doc as unknown as Parameters<typeof renderToBuffer>[0]);
      expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(buf.toString('latin1')).toMatch(/\/MediaBox \[0 0 595\.28\d* 841\.89\d*\]/); // A4
      expect((buf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, name).toBe(pages);
      if (process.env.PDF_OUT) fs.writeFileSync(path.join(process.env.PDF_OUT, `experience_${name}.pdf`), buf);
    }
  }, 60_000);
});
