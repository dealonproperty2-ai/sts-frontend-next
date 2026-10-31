/**
 * Single source of truth for an appointment letter's content.
 *
 * Both the on-screen preview (HTML) and the downloaded PDF (react-pdf, see
 * appointmentLetterPdfDoc.tsx) render this structure, so they can never drift
 * apart. Content is plain text split into runs — never HTML — so entities such
 * as `&amp;` can't leak into the output and admin-entered text can't inject
 * markup.
 *
 * WORDING: transcribed verbatim from the company's approved reference letter
 * ("Appointment-Letter_Zahid_alam (2).pdf"), including its punctuation and
 * spelling (e.g. "STEPTO SOFT" in clause 5, "less that", "after Having"). Only
 * the employee-specific values are substituted. Bold runs follow the reference
 * PDF's font usage. The single deliberate change is the clause-1 heading
 * "PLACE OF WORK" (the reference prints "PLACE OFWORK"), as instructed.
 */
import { HR_NAME_DEFAULT } from '@/lib/hrConstants';

export interface LetterRun {
  text: string;
  bold?: boolean;
  underline?: boolean;
  /** Superscript (e.g. the "nd" in "2nd floor"). */
  sup?: boolean;
}

export interface LetterClause {
  heading: LetterRun[];
  paragraphs: LetterRun[][];
  /** The reference leaves a blank line between this heading and its first paragraph. */
  gapAfterHeading?: boolean;
}

/** The employee fields a letter uses. */
export interface LetterRecipientSource {
  name: string;
  fatherName?: string;
  address?: string;
  email?: string;
  phone?: string;
}

export type Salutation = '' | 'Mr.' | 'Ms.' | 'Mrs.';

/** The letter's own fields (form / saved record). Dates are YYYY-MM-DD or ISO strings. */
export interface LetterFields {
  /** Letter issue date ("Date:" line): the saved record's creation date, or today for a new letter. */
  issueDate: string;
  interviewDate: string;
  offerDate: string;
  joiningDate: string;
  designation: string;
  /** Monthly gross salary as stored by the application; the letter states the annual figure (× 12). */
  salary: number;
  probationPeriod: string;
  hrName: string;
  salutation: Salutation | string;
  customTerms: string;
  /** Employee acceptance section — date of signing, independent of joining and issue dates. Optional. */
  acceptanceDate?: string;
  /** Employee acceptance section — place of signing (city). Optional. */
  acceptancePlace?: string;
}

export interface AppointmentLetterContent {
  issueDate: string;
  recipient: {
    name: string;
    addressLines: string[];
    email: string | null;
    phone: string | null;
  };
  title: string;
  salutation: string;
  opening: LetterRun[];
  clauses: LetterClause[];
  thanking: string;
  signOff: string;
  signatory: { name: string; designation: string };
  acceptance: LetterRun[];
  /** "DD-MM-YYYY", or '' when not entered (the PDF then leaves a fill-in line). */
  acceptanceDate: string;
  /** Trimmed city name, or '' when not entered. */
  acceptancePlace: string;
  candidateName: string;
  /** Required values that are missing (the letter must not be issued) and optional ones (lines omitted). */
  missing: { required: string[]; optional: string[] };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Reads the calendar date from 'YYYY-MM-DD' or an ISO timestamp WITHOUT going
 * through the local time zone (which can shift a stored date by a day).
 */
export function parseLetterDate(value: string | undefined | null): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** Reference style for the letter date, e.g. 20-Nov-2023. */
export function formatIssueDate(value: string): string {
  const p = parseLetterDate(value);
  return p ? `${String(p.d).padStart(2, '0')}-${MONTHS[p.m - 1].slice(0, 3)}-${p.y}` : '';
}

/** Reference style for dates in the body, e.g. 14-November-2023. */
export function formatLongDate(value: string): string {
  const p = parseLetterDate(value);
  return p ? `${String(p.d).padStart(2, '0')}-${MONTHS[p.m - 1]}-${p.y}` : '';
}

/** Reference style for the acceptance date, e.g. 20-11-2023. */
export function formatNumericDate(value: string | undefined | null): string {
  const p = parseLetterDate(value);
  return p ? `${String(p.d).padStart(2, '0')}-${String(p.m).padStart(2, '0')}-${p.y}` : '';
}

export function formatRupees(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);
}

export function localISODate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const clean = (s: string | undefined | null) => (s ?? '').trim();

/** Filesystem-safe segment for download names. */
export function safeFileSegment(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'letter';
}

/** The reference letter is signed "(Mrs. Naheed Zakia)"; the honorific is only known for that signatory. */
const DEFAULT_SIGNATORY_HONORIFIC = 'Mrs.';

/** Heading in the reference's style: number and colon regular, title bold — except where the reference bolds all of it. */
function heading(n: number, title: string, allBold = false): LetterRun[] {
  return allBold
    ? [{ text: `${n}. ${title}:`, bold: true }]
    : [{ text: `${n}. ` }, { text: title, bold: true }, { text: ':' }];
}

export function buildAppointmentLetter(emp: LetterRecipientSource, form: LetterFields): AppointmentLetterContent {
  const name = clean(emp.name);
  const fatherName = clean(emp.fatherName);
  const address = clean(emp.address);
  const email = clean(emp.email);
  const phone = clean(emp.phone);
  const designation = clean(form.designation);
  const salutation = (['Mr.', 'Ms.', 'Mrs.'] as const).find((s) => s === clean(form.salutation)) ?? '';
  const interview = formatLongDate(form.interviewDate);
  const offer = formatLongDate(form.offerDate);
  const joining = formatLongDate(form.joiningDate);
  const annual = (form.salary || 0) > 0 ? formatRupees(form.salary * 12) : '';
  const probation = clean(form.probationPeriod);
  const customTerms = clean(form.customTerms);

  const required: string[] = [];
  if (!salutation) required.push('salutation (Mr./Ms./Mrs.)');
  if (!interview) required.push('interview date');
  if (!offer) required.push('offer letter date');
  if (!joining) required.push('joining date');
  if (!designation) required.push('designation');
  if (!annual) required.push('salary');
  if (!probation) required.push('probation period');
  if (!fatherName) required.push("employee's father's name");
  if (!address) required.push("employee's address");
  const optional: string[] = [];
  if (!email) optional.push('email');
  if (!phone) optional.push('phone');

  // Shown only in the on-screen preview: a letter with missing required values is never downloadable.
  const v = (value: string, label: string) => value || `[${label}]`;

  const addressLines = address.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const relation = salutation === 'Mr.' ? 'S/O' : salutation ? 'D/O' : 'S/O D/O';
  const hrName = clean(form.hrName) || HR_NAME_DEFAULT;

  const clauses: LetterClause[] = [
    {
      heading: heading(1, 'PLACE OF WORK'),
      paragraphs: [[
        { text: 'Your place of work will be at our, IT Building, 2' },
        { text: 'nd', sup: true },
        { text: ' floor Module-21 Asansol Webel IT Park Asansol- 713305, office in the state of West Bengal. However, you may be required to travel and work anywhere in India and abroad, if the company so directs based on the necessity of the company. STEP TO SOFT reserves the right to assign your duties to any of its subsidiaries, associates or group companies, as and when required.' },
      ]],
    },
    {
      heading: heading(2, 'EMOLUMENTS', true),
      paragraphs: [[
        { text: `Your total annual compensation will be Rs. ${v(annual, 'annual compensation')}/-(inclusive of performance bonus and other expenses as applicable).` },
      ]],
    },
    {
      heading: heading(3, 'REPORTING', true),
      paragraphs: [[
        { text: 'You would be reporting to the HOD and/or to whosoever the company deems fit to be your supervisor.' },
      ]],
    },
    {
      heading: heading(4, 'PROBATION'),
      paragraphs: [[
        { text: `You will be placed on probation for a period of ${v(probation, 'probation period')} from your date of joining. On the successful completion of your probation period, you may be confirmed in writing. Your probation period can be extended in case the management is not satisfied with your performance. The probation period will be assumed to have been extended until such time as you receive your confirmation in writing.` },
      ]],
    },
    {
      heading: heading(5, 'REVIEW'),
      paragraphs: [[
        { text: 'Performance will be monitored monthly, with performance-based pay issued at the end of each month. Any increments are discretionary and will be subject to and on the basis of your effective performance and results during the period and also the performance and results of STEPTO SOFT. Generally, salary revisions would be done once every year.' },
      ]],
    },
    {
      heading: heading(6, 'LEAVE'),
      paragraphs: [[
        { text: 'Every employee is eligible for leave as per the prevailing Leave Policy of STEP TO SOFT. Which may be amended from time to time.' },
      ]],
    },
    {
      heading: heading(7, 'WORKING HOURS'),
      paragraphs: [[
        { text: 'You shall have to work a minimum of 47 hours a week between 8.30 AM and 8.30 PM on weekdays. The working hours are subject to change depending on the requirements of STEP TO SOFT.' },
      ]],
    },
    {
      heading: heading(8, 'TERMINATION'),
      gapAfterHeading: true,
      paragraphs: [
        [
          { text: 'a.', bold: true },
          { text: ' This Agreement of Employment is terminable by either party by giving a 30 (thirty) days’ written notice during probationary period and a 30 (thirty) days’ written notice on/after confirmation or on payment of salary in lieu of the notice period. (The decision to accept notice pay in lieu of notice period shall be at the discretion of the management influenced by the business conditions and the employee will have no right to exercise it on his/her free will.) STEP TO SOFT. Reserves the right to recover salary in lieu of any un-served notice period and in case the salary payable is less that the Recovery Amount then you shall have to pay the shortfall. Further, STEP TO SOFT. May at its discretion relieve you from such date as it may deem fit even before the expiry of the notice period.' },
        ],
        [
          { text: 'In the event of any misconduct or breach of discipline or of the conditions of the employment on the part of the employee during probation or on/after confirmation, STEP TO SOFT. Reserves the right to terminate this AGREEMENT immediately without any notice apart from taking appropriate legal action against such misdemeanor whenever it deems fit and appropriate.' },
        ],
      ],
    },
    // Not part of the reference: printed only when an admin entered additional terms for this letter.
    ...(customTerms ? [{ heading: heading(9, 'ADDITIONAL TERMS'), paragraphs: [[{ text: customTerms }]] }] : []),
  ];

  const oneLineAddress = addressLines.join(', ');

  return {
    issueDate: formatIssueDate(form.issueDate) || formatIssueDate(localISODate()),
    recipient: { name, addressLines, email: email || null, phone: phone || null },
    title: 'APPOINTMENT LETTER',
    salutation: salutation ? `Dear ${salutation} ${name}` : `Dear ${name}`,
    opening: [
      { text: 'This has reference to your interview with ' },
      { text: 'STEP TO SOFT', bold: true },
      { text: ' Pvt. Ltd. Company held on Interview date (' },
      { text: v(interview, 'interview date'), bold: true },
      { text: ') and the subsequent Offer Letter dated ' },
      { text: v(offer, 'offer letter date'), bold: true },
      { text: `. We are pleased to appoint you as ${v(designation, 'designation')} in our organization with effect from ` },
      { text: v(joining, 'joining date'), bold: true },
      { text: ' subject to the following terms & conditions. This Appointment Letter supersedes all other communication made to you prior to the date of issue of this Appointment Letter.' },
    ],
    clauses,
    thanking: 'Thanking you,',
    signOff: 'Yours faithfully, For STEP TO SOFT',
    signatory: {
      name: hrName === HR_NAME_DEFAULT ? `${DEFAULT_SIGNATORY_HONORIFIC} ${hrName}` : hrName,
      designation: 'HR',
    },
    acceptance: [
      { text: 'I ' },
      { text: name, underline: true },
      { text: `, ${relation} ` },
      { text: v(fatherName, "father's name"), underline: true },
      { text: `, residing at ${v(oneLineAddress, 'address')}, do hereby accept the appointment based on this Letter of Appointment after Having understood the proper meaning of its contents and obtaining necessary clarifications wherever necessary.` },
    ],
    acceptanceDate: formatNumericDate(form.acceptanceDate),
    acceptancePlace: (form.acceptancePlace ?? '').replace(/\s+/g, ' ').trim(),
    candidateName: name,
    missing: { required, optional },
  };
}
