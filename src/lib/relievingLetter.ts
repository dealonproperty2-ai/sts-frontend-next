/**
 * Relieving Letter — pure content model.
 *
 * One source of truth for the on-screen preview, the print view, the PDF
 * (relievingLetterPdfDoc.tsx) and the API (normalise + validate on the server
 * too). No React, no DB — safe to import anywhere.
 *
 * Wording and layout follow the company's reference relieving letter. Every
 * paragraph can be replaced with edited wording; in edited wording `**text**`
 * is bold and `^text^` is superscript (e.g. 2^nd^).
 */
import { parseLetterDate, type LetterRun } from '@/lib/appointmentLetter';
import { COMPANY_NAME } from '@/lib/hrConstants';
import { isValidLogoData } from '@/lib/internshipLetter';

export const RL_SALUTATIONS = ['', 'Mr.', 'Ms.', 'Mrs.'] as const;
export const RL_PRONOUNS = ['he', 'she', 'they'] as const;
export const IMAGE_MODES = ['default', 'custom', 'none'] as const;
export const RL_EDITABLE = ['greeting', 'intro', 'closing'] as const;

export type RlSalutation = (typeof RL_SALUTATIONS)[number];
export type RlPronoun = (typeof RL_PRONOUNS)[number];
export type ImageMode = (typeof IMAGE_MODES)[number];
export type RlEditable = (typeof RL_EDITABLE)[number];

export const RELIEVING_LIMITS = { name: 100, code: 30, short: 100, remarks: 1500, paragraph: 2000, signatory: 80, imageChars: 400_000 };

export const DEFAULT_SIGNATORY = { company: 'Step To Soft Pvt. Ltd.', department: 'Human Resource', title: 'Authorized Signatory' };
export const DEFAULT_CLOSING = 'The management would like to thank you for your service to the company and we wish you all the best in your future endeavors.';

export interface RelievingLetterInput {
  employeeId: string | null;
  employeeCode: string;
  showEmployeeCode: boolean;
  salutation: RlSalutation;
  employeeName: string;
  pronoun: RlPronoun;
  designation: string;
  department: string;
  joiningDate: string;   // YYYY-MM-DD
  relievingDate: string; // YYYY-MM-DD
  issueDate: string;     // YYYY-MM-DD
  remarks: string;
  /** Edited wording per paragraph; '' = generated wording. */
  greetingText: string;
  introText: string;
  closingText: string;
  signatoryName: string;
  signatoryCompany: string;
  signatoryDepartment: string;
  signatoryTitle: string;
  logoMode: ImageMode;
  logoData: string;
  signatureMode: ImageMode;
  signatureData: string;
}

// ── Branding ────────────────────────────────────────────────────────────────
// The letterhead and footer are the shared branded ones (BRAND in internshipLetter.ts).
export const RL_BRAND = {
  name: COMPANY_NAME.toUpperCase(),          // STEP TO SOFT PVT. LTD.
  bodyName: 'STEP TO SOFT Pvt. Ltd.',         // as written in the reference body text
};

// ── Normalisation ───────────────────────────────────────────────────────────
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const line = (v: unknown, max: number) => str(v, max).replace(/\s+/g, ' ');
const text = (v: unknown, max: number) =>
  str(v, max).split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{2,}/g, '\n');
/** YYYY-MM-DD of a real calendar day (rejects e.g. 2025-02-30), else ''. */
const isoDate = (v: unknown) => {
  const s = typeof v === 'string' ? v.slice(0, 10) : '';
  const p = parseLetterDate(s);
  if (!p || s.length !== 10) return '';
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d));
  return d.getUTCMonth() === p.m - 1 && d.getUTCDate() === p.d ? s : '';
};
const oneOf = <T extends readonly string[]>(list: T, v: unknown, fallback: T[number]): T[number] =>
  (list as readonly string[]).includes(v as string) ? (v as T[number]) : fallback;

export function rlDefaultPronoun(s: RlSalutation): RlPronoun {
  return s === 'Mr.' ? 'he' : s === 'Ms.' || s === 'Mrs.' ? 'she' : 'they';
}

export function normalizeRelievingInput(raw: Record<string, unknown>): RelievingLetterInput {
  const salutation = oneOf(RL_SALUTATIONS, raw.salutation, '');
  const logoMode = oneOf(IMAGE_MODES, raw.logoMode, 'default');
  const signatureMode = oneOf(IMAGE_MODES, raw.signatureMode, 'default');
  return {
    employeeId: typeof raw.employeeId === 'string' && /^[a-f0-9]{24}$/i.test(raw.employeeId) ? raw.employeeId : null,
    employeeCode: line(raw.employeeCode, RELIEVING_LIMITS.code),
    showEmployeeCode: raw.showEmployeeCode === true || raw.showEmployeeCode === 'true',
    salutation,
    employeeName: line(raw.employeeName, RELIEVING_LIMITS.name),
    pronoun: oneOf(RL_PRONOUNS, raw.pronoun, rlDefaultPronoun(salutation)),
    designation: line(raw.designation, RELIEVING_LIMITS.short),
    department: line(raw.department, RELIEVING_LIMITS.short),
    joiningDate: isoDate(raw.joiningDate),
    relievingDate: isoDate(raw.relievingDate),
    issueDate: isoDate(raw.issueDate),
    remarks: text(raw.remarks, RELIEVING_LIMITS.remarks),
    greetingText: line(raw.greetingText, RELIEVING_LIMITS.short * 2),
    introText: text(raw.introText, RELIEVING_LIMITS.paragraph),
    closingText: text(raw.closingText, RELIEVING_LIMITS.paragraph),
    signatoryName: line(raw.signatoryName, RELIEVING_LIMITS.signatory),
    signatoryCompany: line(raw.signatoryCompany, RELIEVING_LIMITS.signatory),
    signatoryDepartment: line(raw.signatoryDepartment, RELIEVING_LIMITS.signatory),
    signatoryTitle: line(raw.signatoryTitle, RELIEVING_LIMITS.signatory),
    logoMode,
    logoData: logoMode === 'custom' && typeof raw.logoData === 'string' ? raw.logoData.trim() : '',
    signatureMode,
    signatureData: signatureMode === 'custom' && typeof raw.signatureData === 'string' ? raw.signatureData.trim() : '',
  };
}

// ── Validation ──────────────────────────────────────────────────────────────
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const TEXT_RE = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .,'&/()+#-]*$/u;
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9/_-]*$/;

export function validateRelievingInput(i: RelievingLetterInput, raw?: Record<string, unknown>): Record<string, string> {
  const e: Record<string, string> = {};
  if (!i.employeeName) e.employeeName = 'Employee name is required.';
  else if (!NAME_RE.test(i.employeeName)) e.employeeName = 'Use letters, spaces, dots, apostrophes or hyphens only.';
  if (!i.designation) e.designation = 'Designation is required.';
  else if (!TEXT_RE.test(i.designation)) e.designation = 'Enter a valid designation (e.g. Software Developer).';
  if (i.department && !TEXT_RE.test(i.department)) e.department = 'Enter a valid department.';
  if (i.employeeCode && !CODE_RE.test(i.employeeCode)) e.employeeCode = 'Use letters, digits, / _ or - only.';
  if (i.showEmployeeCode && !i.employeeCode) e.employeeCode = 'Enter the employee ID, or untick “show in letter”.';

  for (const [k, label] of [['joiningDate', 'Joining date'], ['relievingDate', 'Relieving date'], ['issueDate', 'Issue date']] as const) {
    if (typeof raw?.[k] === 'string' && (raw[k] as string).trim() !== '' && !i[k]) e[k] = `${label} is not a valid date.`;
    else if (!i[k]) e[k] = `${label} is required.`;
  }
  if (i.joiningDate && i.relievingDate && i.relievingDate < i.joiningDate) e.relievingDate = 'Relieving date cannot be before the joining date.';
  if (i.relievingDate && i.issueDate && i.issueDate < i.relievingDate) e.issueDate = 'A relieving letter is issued on or after the relieving date.';

  if (i.logoMode === 'custom' && !isValidLogoData(i.logoData)) e.logoData = 'Upload a PNG or JPEG logo (max 300 KB).';
  if (i.signatureMode === 'custom' && !isValidLogoData(i.signatureData)) e.signatureData = 'Upload a PNG or JPEG signature (max 300 KB).';
  return e;
}

// ── Formatting ──────────────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function ordinalSuffix(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
}

/** Issue date, reference style: "Nov 14th, 2025". */
export function formatIssueDateText(iso: string): string {
  const p = parseLetterDate(iso);
  return p ? `${MONTHS[p.m - 1].slice(0, 3)} ${p.d}${ordinalSuffix(p.d)}, ${p.y}` : '';
}

/** Service-period date as runs with a superscript suffix: 2<sup>nd</sup> June 2025. */
export function periodDateRuns(iso: string, bold = true): LetterRun[] {
  const p = parseLetterDate(iso);
  if (!p) return [];
  return [{ text: String(p.d), bold }, { text: ordinalSuffix(p.d), bold, sup: true }, { text: ` ${MONTHS[p.m - 1]} ${p.y}`, bold }];
}

export function formatPeriodDateText(iso: string): string {
  const p = parseLetterDate(iso);
  return p ? `${p.d}${ordinalSuffix(p.d)} ${MONTHS[p.m - 1]} ${p.y}` : '';
}

// ── Markup for edited wording: **bold**, ^superscript^ ───────────────────────
/** Parses markup into runs. Unpaired markers are kept as literal text. */
export function markupToRunsRl(s: string): LetterRun[] {
  const boldPairs = Math.floor((s.match(/\*\*/g) ?? []).length / 2) * 2;
  const supPairs = Math.floor((s.replace(/\*\*/g, '').match(/\^/g) ?? []).length / 2) * 2;
  const runs: LetterRun[] = [];
  let bold = false, sup = false, buf = '', boldSeen = 0, supSeen = 0;
  const flush = () => { if (buf) runs.push({ text: buf, ...(bold ? { bold: true } : {}), ...(sup ? { sup: true } : {}) }); buf = ''; };
  for (let k = 0; k < s.length; k++) {
    if (s.startsWith('**', k) && boldSeen < boldPairs) { flush(); bold = !bold; boldSeen++; k++; continue; }
    if (s[k] === '^' && supSeen < supPairs) { flush(); sup = !sup; supSeen++; continue; }
    buf += s[k];
  }
  flush();
  return runs;
}

export function runsToMarkupRl(runs: LetterRun[]): string {
  let out = '', bold = false, sup = false;
  for (const r of runs) {
    const b = Boolean(r.bold), u = Boolean(r.sup);
    if (sup && !u) { out += '^'; sup = false; }
    if (bold !== b) { out += '**'; bold = b; }
    if (u && !sup) { out += '^'; sup = true; }
    out += r.text;
  }
  if (sup) out += '^';
  if (bold) out += '**';
  return out;
}

// ── Content ─────────────────────────────────────────────────────────────────
export interface RelievingLetterContent {
  title: string;
  issueDate: string;
  greeting: string;
  paragraphs: LetterRun[][];
  regards: string;
  signatory: { name: string; company: string; department: string; title: string };
  logo: { mode: ImageMode; src: string | null };
  signature: { mode: ImageMode; src: string | null };
  employeeName: string;
}

const FORMS: Record<RlPronoun, { poss: string; s: string; was: string }> = {
  he: { poss: 'his', s: 'he', was: 'was' },
  she: { poss: 'her', s: 'she', was: 'was' },
  they: { poss: 'their', s: 'they', was: 'were' },
};

export function generatedRelieving(i: RelievingLetterInput): { greeting: string; intro: LetterRun[]; closing: LetterRun[] } {
  const f = FORMS[i.pronoun];
  const who = `${i.salutation ? `${i.salutation} ` : ''}${i.employeeName}`;
  const b = (t: string): LetterRun => ({ text: t, bold: true });
  const t = (s: string): LetterRun => ({ text: s });
  const intro: LetterRun[] = [t('This is to certify that '), b(who)];
  if (i.showEmployeeCode && i.employeeCode) intro.push(t(` (Employee ID: ${i.employeeCode})`));
  intro.push(t(' has worked with '), b(RL_BRAND.bodyName), t(' from '),
    ...periodDateRuns(i.joiningDate), b(' to '), ...periodDateRuns(i.relievingDate),
    t(`. At the time of ${f.poss} relieving, ${f.s} ${f.was} designated as `), b(i.designation || 'Employee'));
  if (i.department) intro.push(t(' in the '), b(i.department), t(' department'));
  intro.push(t('.'));
  return { greeting: `Dear ${who},`, intro, closing: [t(DEFAULT_CLOSING)] };
}

export function buildRelievingLetter(i: RelievingLetterInput): RelievingLetterContent {
  const g = generatedRelieving(i);
  const paragraphs = [i.introText ? markupToRunsRl(i.introText) : g.intro];
  if (i.remarks) paragraphs.push(markupToRunsRl(i.remarks));
  paragraphs.push(i.closingText ? markupToRunsRl(i.closingText) : g.closing);
  return {
    title: 'Relieving Letter',
    issueDate: formatIssueDateText(i.issueDate),
    greeting: i.greetingText || g.greeting,
    paragraphs,
    regards: 'Regards',
    signatory: {
      name: i.signatoryName,
      company: i.signatoryCompany || DEFAULT_SIGNATORY.company,
      department: i.signatoryDepartment || DEFAULT_SIGNATORY.department,
      title: i.signatoryTitle || DEFAULT_SIGNATORY.title,
    },
    logo: { mode: i.logoMode, src: i.logoMode === 'custom' && i.logoData ? i.logoData : null },
    signature: { mode: i.signatureMode, src: i.signatureMode === 'custom' && i.signatureData ? i.signatureData : null },
    employeeName: i.employeeName,
  };
}
