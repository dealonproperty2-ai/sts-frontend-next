import { describe, expect, it } from 'vitest';
import {
  buildAppointmentLetter, formatIssueDate, formatLongDate, parseLetterDate, safeFileSegment,
  type AppointmentLetterContent, type LetterFields, type LetterRecipientSource, type LetterRun,
} from '@/lib/appointmentLetter';

/**
 * Golden text: the reference letter ("Appointment-Letter_Zahid_alam (2).pdf"),
 * transcribed from its text layer, with ONLY the employee-specific values
 * replaced by {PLACEHOLDERS}. The single intentional deviation is clause 1's
 * heading, "PLACE OF WORK" (the reference prints "PLACE OFWORK").
 */
const GOLDEN = {
  salutation: 'Dear {SALUTATION} {NAME}',
  opening: 'This has reference to your interview with STEP TO SOFT Pvt. Ltd. Company held on Interview date ({INTERVIEW}) and the subsequent Offer Letter dated {OFFER}. We are pleased to appoint you as {DESIGNATION} in our organization with effect from {JOINING} subject to the following terms & conditions. This Appointment Letter supersedes all other communication made to you prior to the date of issue of this Appointment Letter.',
  clauses: [
    ['1. PLACE OF WORK:', 'Your place of work will be at our, IT Building, 2nd floor Module-21 Asansol Webel IT Park Asansol- 713305, office in the state of West Bengal. However, you may be required to travel and work anywhere in India and abroad, if the company so directs based on the necessity of the company. STEP TO SOFT reserves the right to assign your duties to any of its subsidiaries, associates or group companies, as and when required.'],
    ['2. EMOLUMENTS:', 'Your total annual compensation will be Rs. {ANNUAL}/-(inclusive of performance bonus and other expenses as applicable).'],
    ['3. REPORTING:', 'You would be reporting to the HOD and/or to whosoever the company deems fit to be your supervisor.'],
    ['4. PROBATION:', 'You will be placed on probation for a period of {PROBATION} from your date of joining. On the successful completion of your probation period, you may be confirmed in writing. Your probation period can be extended in case the management is not satisfied with your performance. The probation period will be assumed to have been extended until such time as you receive your confirmation in writing.'],
    ['5. REVIEW:', 'Performance will be monitored monthly, with performance-based pay issued at the end of each month. Any increments are discretionary and will be subject to and on the basis of your effective performance and results during the period and also the performance and results of STEPTO SOFT. Generally, salary revisions would be done once every year.'],
    ['6. LEAVE:', 'Every employee is eligible for leave as per the prevailing Leave Policy of STEP TO SOFT. Which may be amended from time to time.'],
    ['7. WORKING HOURS:', 'You shall have to work a minimum of 47 hours a week between 8.30 AM and 8.30 PM on weekdays. The working hours are subject to change depending on the requirements of STEP TO SOFT.'],
    ['8. TERMINATION:',
      'a. This Agreement of Employment is terminable by either party by giving a 30 (thirty) days’ written notice during probationary period and a 30 (thirty) days’ written notice on/after confirmation or on payment of salary in lieu of the notice period. (The decision to accept notice pay in lieu of notice period shall be at the discretion of the management influenced by the business conditions and the employee will have no right to exercise it on his/her free will.) STEP TO SOFT. Reserves the right to recover salary in lieu of any un-served notice period and in case the salary payable is less that the Recovery Amount then you shall have to pay the shortfall. Further, STEP TO SOFT. May at its discretion relieve you from such date as it may deem fit even before the expiry of the notice period.',
      'In the event of any misconduct or breach of discipline or of the conditions of the employment on the part of the employee during probation or on/after confirmation, STEP TO SOFT. Reserves the right to terminate this AGREEMENT immediately without any notice apart from taking appropriate legal action against such misdemeanor whenever it deems fit and appropriate.'],
  ],
  thanking: 'Thanking you,',
  signOff: 'Yours faithfully, For STEP TO SOFT',
  signatory: ['(Mrs. Naheed Zakia)', 'HR'],
  acceptance: 'I {NAME}, {RELATION} {FATHER}, residing at {ADDRESS}, do hereby accept the appointment based on this Letter of Appointment after Having understood the proper meaning of its contents and obtaining necessary clarifications wherever necessary.',
};

const emp: LetterRecipientSource = {
  name: 'Test Candidate',
  fatherName: 'Test Parent Name',
  address: 'House 1, Test Lane\nTest City\nTest State-700001',
  email: 'candidate@test.local',
  phone: '9000000000',
};
const form: LetterFields = {
  issueDate: '2026-10-22',
  salutation: 'Mr.',
  interviewDate: '2026-10-01',
  offerDate: '2026-10-05',
  joiningDate: '2026-11-03',
  designation: 'Data Analyst',
  salary: 15000,
  probationPeriod: '3 (Three) months',
  hrName: 'Naheed Zakia',
  customTerms: '',
};
const VALUES: Record<string, string> = {
  SALUTATION: 'Mr.', NAME: 'Test Candidate', INTERVIEW: '01-October-2026', OFFER: '05-October-2026',
  DESIGNATION: 'Data Analyst', JOINING: '03-November-2026', ANNUAL: '1,80,000', PROBATION: '3 (Three) months',
  RELATION: 'S/O', FATHER: 'Test Parent Name', ADDRESS: 'House 1, Test Lane, Test City, Test State-700001',
};
const fill = (s: string, v = VALUES) => s.replace(/\{([A-Z]+)\}/g, (_, k) => v[k]);
const text = (runs: LetterRun[]) => runs.map((r) => r.text).join('');

describe('appointment letter wording matches the reference exactly', () => {
  const c = buildAppointmentLetter(emp, form);

  it('salutation and opening paragraph', () => {
    expect(c.salutation).toBe(fill(GOLDEN.salutation));
    expect(text(c.opening)).toBe(fill(GOLDEN.opening));
  });

  it('all eight clauses, in the reference order, verbatim', () => {
    expect(c.clauses).toHaveLength(8);
    c.clauses.forEach((cl, i) => {
      const [head, ...paras] = GOLDEN.clauses[i];
      expect(text(cl.heading)).toBe(head);
      expect(cl.paragraphs.map(text)).toEqual(paras.map((p) => fill(p)));
    });
  });

  it('includes the complete two-paragraph termination clause', () => {
    const t = c.clauses[7];
    expect(t.paragraphs).toHaveLength(2);
    expect(t.gapAfterHeading).toBe(true);
    for (const phrase of ['30 (thirty) days’ written notice during probationary period', 'salary in lieu of the notice period',
      'recover salary in lieu of any un-served notice period', 'pay the shortfall', 'terminate this AGREEMENT immediately without any notice']) {
      expect(t.paragraphs.map(text).join(' ')).toContain(phrase);
    }
  });

  it('closing, signatory and acceptance declaration', () => {
    expect(c.thanking).toBe(GOLDEN.thanking);
    expect(c.signOff).toBe(GOLDEN.signOff);
    expect([`(${c.signatory.name})`, c.signatory.designation]).toEqual(GOLDEN.signatory);
    expect(text(c.acceptance)).toBe(fill(GOLDEN.acceptance));
  });

  it('uses the reference formatting for bold runs, underlines and the superscript', () => {
    const boldOpening = c.opening.filter((r) => r.bold).map((r) => r.text);
    expect(boldOpening).toEqual(['STEP TO SOFT', '01-October-2026', '05-October-2026', '03-November-2026']);
    expect(c.clauses[0].heading).toEqual([{ text: '1. ' }, { text: 'PLACE OF WORK', bold: true }, { text: ':' }]);
    expect(c.clauses[1].heading).toEqual([{ text: '2. EMOLUMENTS:', bold: true }]);
    expect(c.clauses[2].heading).toEqual([{ text: '3. REPORTING:', bold: true }]);
    expect(c.clauses[7].paragraphs[0][0]).toEqual({ text: 'a.', bold: true });
    expect(c.clauses[0].paragraphs[0].find((r) => r.sup)).toEqual({ text: 'nd', sup: true });
    expect(c.acceptance.filter((r) => r.underline).map((r) => r.text)).toEqual(['Test Candidate', 'Test Parent Name']);
  });

  it('recipient block follows the reference ("Date:", name, address lines, email, cell)', () => {
    expect(c.issueDate).toBe('22-Oct-2026');
    expect(c.title).toBe('APPOINTMENT LETTER');
    expect(c.recipient).toEqual({
      name: 'Test Candidate', addressLines: ['House 1, Test Lane', 'Test City', 'Test State-700001'],
      email: 'candidate@test.local', phone: '9000000000',
    });
    expect(c.missing).toEqual({ required: [], optional: [] });
  });
});

describe('dynamic values', () => {
  it('derives S/O vs D/O from the salutation', () => {
    expect(text(buildAppointmentLetter(emp, { ...form, salutation: 'Ms.' }).acceptance)).toContain('Test Candidate, D/O Test Parent Name');
    expect(text(buildAppointmentLetter(emp, { ...form, salutation: 'Mrs.' }).acceptance)).toContain(', D/O ');
    expect(buildAppointmentLetter(emp, { ...form, salutation: 'Ms.' }).salutation).toBe('Dear Ms. Test Candidate');
  });

  it('states annual compensation as 12 × the stored monthly salary', () => {
    const c = buildAppointmentLetter(emp, { ...form, salary: 123456 });
    expect(c.clauses[1].paragraphs[0][0].text).toContain('Rs. 14,81,472/-(inclusive');
  });

  it('only prefixes the honorific for the reference signatory', () => {
    expect(buildAppointmentLetter(emp, form).signatory.name).toBe('Mrs. Naheed Zakia');
    expect(buildAppointmentLetter(emp, { ...form, hrName: 'Another Person' }).signatory.name).toBe('Another Person');
  });

  it('appends admin-entered additional terms as clause 9 only when present, as plain text', () => {
    expect(buildAppointmentLetter(emp, form).clauses).toHaveLength(8);
    const terms = '<b>Bonus</b> & relocation';
    const c = buildAppointmentLetter(emp, { ...form, customTerms: terms });
    expect(text(c.clauses[8].heading)).toBe('9. ADDITIONAL TERMS:');
    expect(c.clauses[8].paragraphs).toEqual([[{ text: terms }]]);
  });
});

describe('missing data is reported, never fabricated', () => {
  const blank: LetterFields = { ...form, salutation: '', interviewDate: '', offerDate: '', joiningDate: '', designation: '', salary: 0, probationPeriod: '' };

  it('lists every missing required value', () => {
    const c = buildAppointmentLetter({ name: 'Solo Name' }, blank);
    expect(c.missing.required).toEqual([
      'salutation (Mr./Ms./Mrs.)', 'interview date', 'offer letter date', 'joining date', 'designation', 'salary',
      'probation period', "employee's father's name", "employee's address",
    ]);
    expect(c.missing.optional).toEqual(['email', 'phone']);
  });

  it('shows visible placeholders (preview only) instead of empty strings or dashes', () => {
    const c = buildAppointmentLetter({ name: 'Solo Name' }, blank);
    const all = [text(c.opening), ...c.clauses.flatMap((cl) => cl.paragraphs.map(text)), text(c.acceptance)].join(' ');
    for (const p of ['[interview date]', '[offer letter date]', '[joining date]', '[designation]', '[annual compensation]', "[father's name]", '[address]']) {
      expect(all).toContain(p);
    }
    expect(all).not.toMatch(/undefined|NaN|Invalid Date| — /);
    expect(c.salutation).toBe('Dear Solo Name');
  });

  it('never renders HTML entities', () => {
    const c = buildAppointmentLetter(emp, form);
    const all = JSON.stringify(c);
    expect(all).not.toMatch(/&amp;|&apos;|&#\d+;/);
    expect(text(c.opening)).toContain('terms & conditions');
  });
});

describe('employee acceptance date and place', () => {
  it('formats the acceptance date as DD-MM-YYYY and trims the place', () => {
    const c = buildAppointmentLetter(emp, { ...form, acceptanceDate: '2026-10-22', acceptancePlace: '  Dhanbad  ' });
    expect(c.acceptanceDate).toBe('22-10-2026');
    expect(c.acceptancePlace).toBe('Dhanbad');
  });

  it('keeps the calendar date of a stored ISO timestamp (no time-zone shift)', () => {
    expect(buildAppointmentLetter(emp, { ...form, acceptanceDate: '2026-01-31T00:00:00.000Z' }).acceptanceDate).toBe('31-01-2026');
  });

  it('is independent of the joining and issue dates', () => {
    const c = buildAppointmentLetter(emp, { ...form, acceptanceDate: '2026-10-25', acceptancePlace: 'Asansol' });
    expect(c.acceptanceDate).toBe('25-10-2026');
    expect(c.issueDate).toBe('22-Oct-2026');
    expect(text(c.opening)).toContain('with effect from 03-November-2026');
  });

  it('stays empty (no default date or city) when not entered or invalid', () => {
    for (const v of [{}, { acceptanceDate: '', acceptancePlace: '   ' }, { acceptanceDate: 'not-a-date' }]) {
      const c = buildAppointmentLetter(emp, { ...form, ...v });
      expect(c.acceptanceDate).toBe('');
      expect(c.acceptancePlace).toBe('');
    }
  });

  it('does not change the acceptance declaration wording', () => {
    const c = buildAppointmentLetter(emp, { ...form, acceptanceDate: '2026-10-22', acceptancePlace: 'Dhanbad' });
    expect(text(c.acceptance)).toBe(fill(GOLDEN.acceptance));
  });
});

describe('dates', () => {
  it('formats like the reference letter', () => {
    expect(formatIssueDate('2023-11-20')).toBe('20-Nov-2023');
    expect(formatLongDate('2023-11-14')).toBe('14-November-2023');
  });

  it('reads the calendar date of ISO timestamps without a time-zone shift', () => {
    expect(formatLongDate('2026-11-03T00:00:00.000Z')).toBe('03-November-2026');
    expect(parseLetterDate('2026-01-31T23:30:00.000-05:00')).toEqual({ y: 2026, m: 1, d: 31 });
  });

  it('returns empty for missing or invalid dates', () => {
    expect(formatLongDate('')).toBe('');
    expect(formatIssueDate('2026-13-01')).toBe('');
  });
});

describe('safeFileSegment', () => {
  it('keeps codes and dates, strips unsafe characters', () => {
    expect(safeFileSegment('STS2020095')).toBe('STS2020095');
    expect(safeFileSegment('a/b\\c:d')).toBe('a-b-c-d');
  });
});

// Type-only guard so an accidental field removal breaks compilation, not just output.
const _shape: (keyof AppointmentLetterContent)[] = ['issueDate', 'recipient', 'title', 'salutation', 'opening', 'clauses', 'thanking', 'signOff', 'signatory', 'acceptance', 'candidateName', 'missing'];
void _shape;
