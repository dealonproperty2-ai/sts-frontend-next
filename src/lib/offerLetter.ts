/**
 * Offer letters — shared domain logic (no server or browser-only imports), used
 * by the admin form, the API routes and the PDF/preview renderers so the rules
 * can never drift apart:
 *   - input normalisation + validation (client and server run the same checks)
 *   - status workflow (allowed transitions)
 *   - offer numbering format
 *   - the letter's content model (buildOfferLetter)
 *
 * WORDING STATUS: no company-approved offer letter template exists in the
 * project. The wording in buildOfferLetter() is a DRAFT TEMPLATE written for
 * this feature and MUST be reviewed by HR/legal before offers are issued
 * (see OFFER_TEMPLATE_APPROVED). It deliberately keeps legal language minimal
 * and reuses only verified facts: company details and signatory (hrConstants)
 * and the house style of the company's reference appointment letter.
 */
import { formatIssueDate, formatLongDate, formatNumericDate, formatRupees, parseLetterDate, type LetterRun } from '@/lib/appointmentLetter';
import { COMPANY_ADDRESS, COMPANY_EMAIL, HR_NAME_DEFAULT } from '@/lib/hrConstants';

/** Flip to true once HR/legal have approved the offer letter wording below. */
export const OFFER_TEMPLATE_APPROVED = false;

// ── Status workflow ──────────────────────────────────────────────────────────

export const OFFER_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired', 'revoked'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined', expired: 'Expired', revoked: 'Revoked',
};

/**
 * Allowed transitions. Only a draft can be edited; once sent, the offer's
 * content is frozen and only its outcome can be recorded. accepted / declined /
 * expired / revoked are final. Downloading or printing never changes status.
 */
export const OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  draft: ['sent', 'revoked'],
  sent: ['accepted', 'declined', 'expired', 'revoked'],
  accepted: [],
  declined: [],
  expired: [],
  revoked: [],
};

export function isOfferStatus(v: unknown): v is OfferStatus {
  return typeof v === 'string' && (OFFER_STATUSES as readonly string[]).includes(v);
}

export function canTransition(from: OfferStatus, to: OfferStatus): boolean {
  return OFFER_TRANSITIONS[from]?.includes(to) ?? false;
}

/** An offer can only be marked expired once its acceptance deadline has passed. */
export function isDeadlinePassed(validUntil: string, todayISO: string): boolean {
  const v = (validUntil ?? '').slice(0, 10);
  return Boolean(parseLetterDate(v)) && v < todayISO.slice(0, 10);
}

// ── Numbering ────────────────────────────────────────────────────────────────

/** STS/HR/OL/2026/0007 — follows the app's former STS/HR/APT/… reference style. */
export function formatOfferNumber(year: number, seq: number): string {
  return `STS/HR/OL/${year}/${String(seq).padStart(4, '0')}`;
}

// ── Input ────────────────────────────────────────────────────────────────────

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const OFFER_SALUTATIONS = ['', 'Mr.', 'Ms.', 'Mrs.'] as const;

export interface OfferLetterInput {
  employeeId: string | null;
  salutation: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateAddress: string;
  department: string;
  designation: string;
  employmentType: string;
  workLocation: string;
  reportingManager: string;
  /** YYYY-MM-DD */
  joiningDate: string;
  issueDate: string;
  validUntil: string;
  /** Monthly gross salary (₹) — the application's standard salary unit. */
  monthlyGross: number;
  /** Optional monthly components; when any is set they must add up to monthlyGross. */
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  /** Optional annual cost-to-company — entered explicitly, never derived. */
  annualCtc: number | null;
  benefits: string;
  incentives: string;
  probationPeriod: string;
  workingHours: string;
  additionalTerms: string;
  hrName: string;
  /**
   * Candidate acceptance section (YYYY-MM-DD / city). Optional — usually filled
   * once the candidate accepts. Independent of the issue and joining dates and
   * never changes the offer status.
   */
  acceptanceDate: string;
  acceptancePlace: string;
}

export const OFFER_LIMITS = { name: 120, email: 120, phone: 20, address: 500, short: 120, text: 3000, maxMoney: 100_000_000, place: 100 };

/** Statuses whose acceptance date/place may still be recorded (content of a sent offer stays frozen). */
export const ACCEPTANCE_EDITABLE_STATUSES: readonly OfferStatus[] = ['draft', 'sent', 'accepted'];

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const line = (v: unknown, max: number) => str(v, max).replace(/\s+/g, ' ');
const money = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const isoDate = (v: unknown) => {
  const s = typeof v === 'string' ? v.slice(0, 10) : '';
  return parseLetterDate(s) ? s : '';
};

/** Coerces any request/form payload into a clean OfferLetterInput (never throws). */
export function normalizeOfferInput(raw: Record<string, unknown>): OfferLetterInput {
  const ctc = raw.annualCtc === '' || raw.annualCtc === null || raw.annualCtc === undefined ? null : money(raw.annualCtc);
  return {
    employeeId: typeof raw.employeeId === 'string' && /^[a-f0-9]{24}$/i.test(raw.employeeId) ? raw.employeeId : null,
    salutation: (OFFER_SALUTATIONS as readonly string[]).includes(raw.salutation as string) ? (raw.salutation as string) : '',
    candidateName: line(raw.candidateName, OFFER_LIMITS.name),
    candidateEmail: line(raw.candidateEmail, OFFER_LIMITS.email).toLowerCase(),
    candidatePhone: line(raw.candidatePhone, OFFER_LIMITS.phone),
    candidateAddress: str(raw.candidateAddress, OFFER_LIMITS.address).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join('\n'),
    department: line(raw.department, OFFER_LIMITS.short),
    designation: line(raw.designation, OFFER_LIMITS.short),
    employmentType: line(raw.employmentType, 40),
    workLocation: line(raw.workLocation, OFFER_LIMITS.short * 2),
    reportingManager: line(raw.reportingManager, OFFER_LIMITS.short),
    joiningDate: isoDate(raw.joiningDate),
    issueDate: isoDate(raw.issueDate),
    validUntil: isoDate(raw.validUntil),
    monthlyGross: money(raw.monthlyGross),
    basicSalary: money(raw.basicSalary),
    hra: money(raw.hra),
    specialAllowance: money(raw.specialAllowance),
    annualCtc: ctc,
    benefits: str(raw.benefits, OFFER_LIMITS.text),
    incentives: str(raw.incentives, OFFER_LIMITS.text),
    probationPeriod: line(raw.probationPeriod, 60),
    workingHours: line(raw.workingHours, OFFER_LIMITS.short),
    additionalTerms: str(raw.additionalTerms, OFFER_LIMITS.text),
    hrName: line(raw.hrName, OFFER_LIMITS.name) || HR_NAME_DEFAULT,
    acceptanceDate: isoDate(raw.acceptanceDate),
    acceptancePlace: line(raw.acceptancePlace, OFFER_LIMITS.place),
  };
}

/** A place name: starts with a letter; letters, digits, spaces and . , ' ( ) & / - only. */
const PLACE_RE = /^[\p{L}\p{M}][\p{L}\p{M}0-9 .,'()&/-]*$/u;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Acceptance date/place checks — also used on their own for issued offers. `raw` catches unparseable dates. */
export function validateAcceptance(i: Pick<OfferLetterInput, 'acceptanceDate' | 'acceptancePlace' | 'issueDate'>, raw?: Record<string, unknown>): Record<string, string> {
  const e: Record<string, string> = {};
  const rawDate = raw?.acceptanceDate;
  if (typeof rawDate === 'string' && rawDate.trim() && !i.acceptanceDate) e.acceptanceDate = 'Enter a valid acceptance date.';
  else if (i.acceptanceDate && i.issueDate && i.acceptanceDate < i.issueDate) e.acceptanceDate = 'Acceptance date cannot be before the offer issue date.';
  if (i.acceptancePlace && !PLACE_RE.test(i.acceptancePlace)) e.acceptancePlace = 'Enter a valid place name (e.g. Asansol).';
  return e;
}

/** Returns field → message for every problem; empty object means valid. */
export function validateOfferInput(i: OfferLetterInput, raw?: Record<string, unknown>): Record<string, string> {
  const e: Record<string, string> = { ...validateAcceptance(i, raw) };
  if (!i.candidateName) e.candidateName = 'Candidate name is required.';
  if (i.candidateEmail && !EMAIL_RE.test(i.candidateEmail)) e.candidateEmail = 'Enter a valid email address.';
  if (i.candidatePhone && (!/^[+()\-\s\d]+$/.test(i.candidatePhone) || i.candidatePhone.replace(/\D/g, '').length < 7)) {
    e.candidatePhone = 'Enter a valid phone number.';
  }
  if (!i.department) e.department = 'Department is required.';
  if (!i.designation) e.designation = 'Designation is required.';
  if (!(EMPLOYMENT_TYPES as readonly string[]).includes(i.employmentType)) e.employmentType = 'Choose an employment type.';
  if (!i.issueDate) e.issueDate = 'Offer issue date is required.';
  if (!i.joiningDate) e.joiningDate = 'Joining date is required.';
  else if (i.issueDate && i.joiningDate < i.issueDate) e.joiningDate = 'Joining date cannot be before the issue date.';
  if (!i.validUntil) e.validUntil = 'Acceptance deadline is required.';
  else if (i.issueDate && i.validUntil < i.issueDate) e.validUntil = 'Deadline cannot be before the issue date.';

  const moneyOk = (n: number) => Number.isFinite(n) && n >= 0 && n <= OFFER_LIMITS.maxMoney;
  if (!moneyOk(i.monthlyGross) || i.monthlyGross <= 0) e.monthlyGross = 'Monthly gross salary must be a positive amount.';
  for (const k of ['basicSalary', 'hra', 'specialAllowance'] as const) {
    if (!moneyOk(i[k])) e[k] = 'Enter a valid non-negative amount.';
  }
  const parts = i.basicSalary + i.hra + i.specialAllowance;
  if (!e.monthlyGross && !e.basicSalary && !e.hra && !e.specialAllowance && parts > 0 && Math.abs(parts - i.monthlyGross) > 0.5) {
    e.salaryComponents = `Basic + HRA + Special Allowance (₹${formatRupees(parts)}) must equal the monthly gross salary (₹${formatRupees(i.monthlyGross)}).`;
  }
  if (i.annualCtc !== null && (!moneyOk(i.annualCtc) || i.annualCtc <= 0)) e.annualCtc = 'Annual CTC must be a positive amount (or leave it empty).';
  return e;
}

// ── Content model (preview + PDF) ────────────────────────────────────────────

export interface OfferSection {
  heading: LetterRun[];
  paragraphs: LetterRun[][];
  /** Compensation table rows (label, amount text, emphasised). */
  table?: Array<{ label: string; value: string; strong?: boolean }>;
}

export interface OfferLetterContent {
  issueDate: string;
  recipient: { name: string; addressLines: string[]; email: string | null; phone: string | null };
  title: string;
  salutation: string;
  sections: OfferSection[];
  closing: string;
  signOff: string;
  signatory: { name: string; designation: string };
  acceptanceHeading: string;
  acceptance: LetterRun[];
  candidateName: string;
  /** Acceptance date as DD-MM-YYYY and place; empty string when not yet recorded (rendered as a blank line). */
  acceptanceDate: string;
  acceptancePlace: string;
}

const EMPLOYMENT_PHRASE: Record<string, string> = {
  'Full-time': 'a full-time position', 'Part-time': 'a part-time position',
  Contract: 'a contractual position', Internship: 'an internship',
};

/** The reference letter is signed "(Mrs. Naheed Zakia)"; the honorific is only known for that signatory. */
const DEFAULT_SIGNATORY_HONORIFIC = 'Mrs.';

const heading = (n: number, title: string): LetterRun[] => [{ text: `${n}. ` }, { text: title, bold: true }, { text: ':' }];
const rs = (n: number) => `Rs. ${formatRupees(n)}/-`;

export function buildOfferLetter(i: OfferLetterInput): OfferLetterContent {
  const company = 'STEP TO SOFT Pvt. Ltd.';
  const sections: Array<Omit<OfferSection, 'heading'> & { title: string }> = [];

  sections.push({
    title: 'OFFER OF EMPLOYMENT',
    paragraphs: [[
      { text: 'We are pleased to offer you the position of ' }, { text: i.designation, bold: true },
      { text: ` at ${company} (the “Company”), on the terms and conditions set out in this letter.` },
    ]],
  });
  sections.push({
    title: 'POSITION AND DEPARTMENT',
    paragraphs: [[
      { text: `Your position will be ${i.designation} in the ${i.department} department. This is ${EMPLOYMENT_PHRASE[i.employmentType] ?? 'a position'} with the Company.` },
    ]],
  });
  sections.push({
    title: 'PLACE OF WORK',
    paragraphs: [[{ text: 'Your place of work will be ' }, { text: i.workLocation || COMPANY_ADDRESS, bold: true }, { text: '.' }]],
  });
  sections.push({
    title: 'PROPOSED DATE OF JOINING',
    paragraphs: [[{ text: 'Your proposed date of joining is ' }, { text: formatLongDate(i.joiningDate), bold: true }, { text: '.' }]],
  });

  const table: OfferSection['table'] = [];
  if (i.basicSalary > 0) table.push({ label: 'Basic Salary (per month)', value: rs(i.basicSalary) });
  if (i.hra > 0) table.push({ label: 'House Rent Allowance (per month)', value: rs(i.hra) });
  if (i.specialAllowance > 0) table.push({ label: 'Special Allowance (per month)', value: rs(i.specialAllowance) });
  table.push({ label: 'Monthly Gross Salary', value: rs(i.monthlyGross), strong: true });
  table.push({ label: 'Annual Gross Salary (12 × monthly gross)', value: rs(i.monthlyGross * 12) });
  if (i.annualCtc) table.push({ label: 'Annual Cost to Company (CTC)', value: rs(i.annualCtc), strong: true });
  const compParas: LetterRun[][] = [[{ text: 'Your compensation will be as follows:' }]];
  const after: LetterRun[][] = [];
  if (i.benefits) after.push([{ text: 'Benefits: ', bold: true }, { text: i.benefits }]);
  if (i.incentives) after.push([{ text: 'Incentives: ', bold: true }, { text: i.incentives }]);
  after.push([{ text: 'All payments are subject to statutory deductions and taxes as applicable under law.' }]);
  sections.push({ title: 'COMPENSATION AND BENEFITS', paragraphs: [...compParas, ...after], table });

  if (i.probationPeriod) {
    sections.push({
      title: 'PROBATION',
      paragraphs: [[{ text: 'You will be on probation for a period of ' }, { text: i.probationPeriod, bold: true }, { text: ' from your date of joining.' }]],
    });
  }
  if (i.workingHours || i.reportingManager) {
    const p: LetterRun[] = [];
    if (i.workingHours) p.push({ text: 'Your working hours will be ' }, { text: i.workingHours, bold: true }, { text: '.' });
    if (i.reportingManager) p.push({ text: `${p.length ? ' ' : ''}You will report to ` }, { text: i.reportingManager, bold: true }, { text: '.' });
    sections.push({ title: i.workingHours && i.reportingManager ? 'WORKING HOURS AND REPORTING' : i.workingHours ? 'WORKING HOURS' : 'REPORTING', paragraphs: [p] });
  }
  sections.push({
    title: 'OFFER VALIDITY AND ACCEPTANCE',
    paragraphs: [[
      { text: 'This offer is valid until ' }, { text: formatLongDate(i.validUntil), bold: true },
      { text: `. To accept it, please sign the acceptance section below and return a copy of this letter to the HR department (${COMPANY_EMAIL}) on or before that date. If we do not receive your acceptance by then, this offer will lapse.` },
    ]],
  });
  sections.push({
    title: 'CONDITIONS OF THIS OFFER',
    paragraphs: [[{ text: 'This offer is subject to verification of the documents and information you have provided. On joining, you will receive an Appointment Letter setting out the detailed terms and conditions of your employment.' }]],
  });
  if (i.additionalTerms) sections.push({ title: 'ADDITIONAL TERMS', paragraphs: [[{ text: i.additionalTerms }]] });

  const addressLines = i.candidateAddress.split('\n').map((l) => l.trim()).filter(Boolean);
  const hrName = i.hrName || HR_NAME_DEFAULT;

  return {
    issueDate: formatIssueDate(i.issueDate),
    recipient: { name: i.candidateName, addressLines, email: i.candidateEmail || null, phone: i.candidatePhone || null },
    title: 'OFFER LETTER',
    salutation: i.salutation ? `Dear ${i.salutation} ${i.candidateName}` : `Dear ${i.candidateName}`,
    sections: sections.map((s, n) => ({ heading: heading(n + 1, s.title), paragraphs: s.paragraphs, table: s.table })),
    closing: 'We look forward to welcoming you to the Company.',
    signOff: 'Yours faithfully, For STEP TO SOFT',
    signatory: { name: hrName === HR_NAME_DEFAULT ? `${DEFAULT_SIGNATORY_HONORIFIC} ${hrName}` : hrName, designation: 'HR' },
    acceptanceHeading: 'ACCEPTANCE BY CANDIDATE',
    acceptance: [
      { text: 'I, ' }, { text: i.candidateName, underline: true },
      // `company` already ends with a full stop ("Pvt. Ltd.").
      { text: `, have read and understood the terms of this offer and accept the offer of employment as ${i.designation} with ${company}` },
    ],
    candidateName: i.candidateName,
    acceptanceDate: i.acceptanceDate ? formatNumericDate(i.acceptanceDate) : '',
    acceptancePlace: i.acceptancePlace,
  };
}

/** Today's date as YYYY-MM-DD in local time (no UTC shift). */
export function todayLocalISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
