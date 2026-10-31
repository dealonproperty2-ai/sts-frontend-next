import fs from 'fs';
import path from 'path';
import React from 'react';
import { describe, expect, it } from 'vitest';
import {
  buildRelievingLetter, formatIssueDateText, formatPeriodDateText, generatedRelieving, markupToRunsRl, normalizeRelievingInput,
  ordinalSuffix, runsToMarkupRl, validateRelievingInput, RL_BRAND, type RelievingLetterInput,
} from '@/lib/relievingLetter';

const raw = {
  salutation: 'Mr.', employeeName: '  Meraj   Rizwan ', designation: 'Software Developer', joiningDate: '2024-06-02',
  relievingDate: '2025-11-14', issueDate: '2025-11-14',
};
const good = () => normalizeRelievingInput(raw);
const runsText = (r: { text: string; sup?: boolean }[]) => r.map((x) => x.text).join('');
const paras = (i: RelievingLetterInput) => buildRelievingLetter(i).paragraphs.map(runsText);

describe('relieving letter — wording (matches the reference)', () => {
  it('reproduces the reference letter text', () => {
    const c = buildRelievingLetter(good());
    expect(c).toMatchObject({ title: 'Relieving Letter', issueDate: 'Nov 14th, 2025', greeting: 'Dear Mr. Meraj Rizwan,', regards: 'Regards',
      signatory: { name: '', company: 'Step To Soft Pvt. Ltd.', department: 'Human Resource', title: 'Authorized Signatory' } });
    expect(paras(good())).toEqual([
      'This is to certify that Mr. Meraj Rizwan has worked with STEP TO SOFT Pvt. Ltd. from 2nd June 2024 to 14th November 2025. At the time of his relieving, he was designated as Software Developer.',
      'The management would like to thank you for your service to the company and we wish you all the best in your future endeavors.',
    ]);
  });

  it('bolds name, company, period and designation, with superscript ordinals', () => {
    const intro = generatedRelieving(good()).intro;
    expect(intro.filter((r) => r.bold && !r.sup).map((r) => r.text)).toEqual(['Mr. Meraj Rizwan', 'STEP TO SOFT Pvt. Ltd.', '2', ' June 2024', ' to ', '14', ' November 2025', 'Software Developer']);
    expect(intro.filter((r) => r.sup).map((r) => r.text)).toEqual(['nd', 'th']);
  });

  it('uses pronouns with correct agreement and optional details', () => {
    const she = paras(normalizeRelievingInput({ ...raw, salutation: 'Ms.', employeeName: 'Priya Sharma' }))[0];
    expect(she).toContain('At the time of her relieving, she was designated as');
    const they = paras(normalizeRelievingInput({ ...raw, salutation: '', pronoun: 'they', department: 'Engineering', employeeCode: 'STS0042', showEmployeeCode: true }))[0];
    expect(they).toBe('This is to certify that Meraj Rizwan (Employee ID: STS0042) has worked with STEP TO SOFT Pvt. Ltd. from 2nd June 2024 to 14th November 2025. At the time of their relieving, they were designated as Software Developer in the Engineering department.');
    expect(buildRelievingLetter(normalizeRelievingInput({ ...raw, salutation: '' })).greeting).toBe('Dear Meraj Rizwan,');
  });

  it('adds remarks and edited wording (bold + superscript markup)', () => {
    const c = buildRelievingLetter(normalizeRelievingInput({ ...raw, remarks: 'He has **no dues** pending.', greetingText: 'Dear Sir,', closingText: 'Thank you, effective 1^st^ Dec.' }));
    expect(c.greeting).toBe('Dear Sir,');
    expect(c.paragraphs[1]).toEqual([{ text: 'He has ' }, { text: 'no dues', bold: true }, { text: ' pending.' }]);
    expect(c.paragraphs[2]).toEqual([{ text: 'Thank you, effective 1' }, { text: 'st', sup: true }, { text: ' Dec.' }]);
  });

  it('round-trips generated wording through markup', () => {
    const intro = generatedRelieving(good()).intro;
    const back = markupToRunsRl(runsToMarkupRl(intro));
    expect(runsText(back)).toBe(runsText(intro));
    expect(back.filter((r) => r.sup).map((r) => r.text)).toEqual(['nd', 'th']);
    expect(back.filter((r) => r.bold).map((r) => r.text).join('')).toBe(intro.filter((r) => r.bold).map((r) => r.text).join(''));
    expect(markupToRunsRl('2 ** 3 ^ x')).toEqual([{ text: '2 ** 3 ^ x' }]);
  });

  it('never renders undefined, null or NaN', () => {
    const t = paras(normalizeRelievingInput({ ...raw, department: '', employeeCode: '' })).join(' ');
    expect(t).not.toMatch(/undefined|null|NaN|&amp;/);
  });
});

describe('relieving letter — helpers and validation', () => {
  it('formats dates and ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map((n) => n + ordinalSuffix(n))).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st']);
    expect(formatIssueDateText('2025-11-14')).toBe('Nov 14th, 2025');
    expect(formatPeriodDateText('2025-06-02')).toBe('2nd June 2025');
    expect(formatIssueDateText('')).toBe('');
  });

  it('uses the company name from the configuration', () => {
    expect(RL_BRAND).toEqual({ name: 'STEP TO SOFT PVT. LTD.', bodyName: 'STEP TO SOFT Pvt. Ltd.' });
  });

  const v = (over: Record<string, unknown>) => validateRelievingInput(normalizeRelievingInput({ ...raw, ...over }), { ...raw, ...over });

  it('accepts valid data and requires the essentials', () => {
    expect(v({})).toEqual({});
    const e = validateRelievingInput(normalizeRelievingInput({}));
    for (const k of ['employeeName', 'designation', 'joiningDate', 'relievingDate', 'issueDate']) expect(e[k], k).toBeTruthy();
  });

  it('rejects the reference’s reversed period and early issue dates', () => {
    expect(v({ joiningDate: '2025-06-02', relievingDate: '2024-11-14', issueDate: '2025-11-14' }).relievingDate).toMatch(/before the joining date/);
    expect(v({ issueDate: '2025-11-13' }).issueDate).toMatch(/on or after the relieving date/);
    expect(v({ joiningDate: '2025-02-30' }).joiningDate).toMatch(/not a valid date/);
    expect(v({ joiningDate: '2024-02-29' })).toEqual({}); // leap day is real
  });

  it('checks names, employee ID and images', () => {
    expect(v({ employeeName: '<b>x</b>' }).employeeName).toBeTruthy();
    expect(v({ showEmployeeCode: true }).employeeCode).toBeTruthy();
    expect(v({ employeeCode: 'STS 01;' }).employeeCode).toBeTruthy();
    expect(v({ signatureMode: 'custom', signatureData: 'data:image/png;base64,AAAA' }).signatureData).toBeTruthy();
    expect(v({ logoMode: 'none', signatureMode: 'none' })).toEqual({});
  });
});

describe('relieving letter — PDF', () => {
  it('renders a valid, text-based A4 PDF', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const { RelievingLetterDocument } = await import('@/lib/relievingLetterPdfDoc');
    const variants: Record<string, Record<string, unknown>> = {
      reference: {},
      long: {
        employeeName: 'Venkata Lakshmi Narasimha Subrahmanya Sastry Chakravarthula', designation: 'Senior Principal Software Engineering Consultant (Platform & Reliability)',
        department: 'Engineering & Delivery', employeeCode: 'STS9200001', showEmployeeCode: true, signatoryName: 'Naheed Zakia',
        remarks: Array.from({ length: 9 }, () => 'He has completed the handover of all assigned work and has no dues pending with the company as on the relieving date.').join(' '),
      },
    };
    for (const [name, over] of Object.entries(variants)) {
      const doc = React.createElement(RelievingLetterDocument, { content: buildRelievingLetter(normalizeRelievingInput({ ...raw, ...over })) });
      const buf = await renderToBuffer(doc as unknown as Parameters<typeof renderToBuffer>[0]);
      expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(buf.toString('latin1')).toMatch(/\/MediaBox \[0 0 595\.28\d* 841\.89\d*\]/); // A4
      if (process.env.PDF_OUT) fs.writeFileSync(path.join(process.env.PDF_OUT, `relieving_${name}.pdf`), buf);
    }
  }, 60_000);

  it('paginates long letters onto a second page', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const { RelievingLetterDocument } = await import('@/lib/relievingLetterPdfDoc');
    const sentence = 'He completed the handover of all assigned work, returned all company assets and has no dues pending with the company. ';
    const content = buildRelievingLetter(normalizeRelievingInput({
      ...raw, remarks: sentence.repeat(12).slice(0, 1500), introText: `${runsToMarkupRl(generatedRelieving(good()).intro)} ${sentence.repeat(12)}`,
    }));
    const doc = React.createElement(RelievingLetterDocument, { content });
    const buf = await renderToBuffer(doc as unknown as Parameters<typeof renderToBuffer>[0]);
    expect((buf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBe(2);
    if (process.env.PDF_OUT) fs.writeFileSync(path.join(process.env.PDF_OUT, 'relieving_twopage.pdf'), buf);
  }, 60_000);
});
