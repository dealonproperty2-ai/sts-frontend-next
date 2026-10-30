/**
 * Experience Letter — pure content model.
 *
 * One source of truth for the on-screen preview, the print view, the PDF
 * (experienceLetterPdfDoc.tsx) and the API (normalise + validate on the server
 * too). No React, no DB — safe to import anywhere.
 *
 * Wording follows the company's reference experience letter ("To whom it may
 * concern … has worked as … from … to …"), with its run-on sentence and typo
 * corrected. Edited wording supports `**bold**` and `^superscript^` (shared
 * with the relieving letter).
 */
import { parseLetterDate, type LetterRun } from '@/lib/appointmentLetter';
import { article, isValidLogoData } from '@/lib/internshipLetter';
import {
  DEFAULT_SIGNATORY, IMAGE_MODES, RL_PRONOUNS, RL_SALUTATIONS, markupToRunsRl, ordinalSuffix, rlDefaultPronoun,
  type ImageMode, type RlPronoun, type RlSalutation,
} from '@/lib/relievingLetter';

export { DEFAULT_SIGNATORY, IMAGE_MODES, RL_PRONOUNS as EL_PRONOUNS, RL_SALUTATIONS as EL_SALUTATIONS, rlDefaultPronoun };
export { runsToMarkupRl } from '@/lib/relievingLetter';
export type { RlSalutation } from '@/lib/relievingLetter';
export const EL_RATINGS = ['excellent', 'very good', 'good', 'satisfactory'] as const;
export type ElRating = (typeof EL_RATINGS)[number];

export const EXPERIENCE_LIMITS = { name: 100, code: 30, short: 100, remarks: 1500, paragraph: 2000, signatory: 80 };

export interface ExperienceLetterInput {
  employeeId: string | null;
  employeeCode: string;
  showEmployeeCode: boolean;
  salutation: RlSalutation;
  employeeName: string;
  pronoun: RlPronoun;
  designation: string;
  department: string;
  joiningDate: string; // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD (last working day)
  issueDate: string;   // YYYY-MM-DD
  rating: ElRating;
  remarks: string;
  /** Edited wording; '' = generated wording. */
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

export function normalizeExperienceInput(raw: Record<string, unknown>): ExperienceLetterInput {
  const salutation = oneOf(RL_SALUTATIONS, raw.salutation, '');
  const logoMode = oneOf(IMAGE_MODES, raw.logoMode, 'default');
  const signatureMode = oneOf(IMAGE_MODES, raw.signatureMode, 'default');
  return {
    employeeId: typeof raw.employeeId === 'string' && /^[a-f0-9]{24}$/i.test(raw.employeeId) ? raw.employeeId : null,
    employeeCode: line(raw.employeeCode, EXPERIENCE_LIMITS.code),
    showEmployeeCode: raw.showEmployeeCode === true || raw.showEmployeeCode === 'true',
    salutation,
    employeeName: line(raw.employeeName, EXPERIENCE_LIMITS.name),
    pronoun: oneOf(RL_PRONOUNS, raw.pronoun, rlDefaultPronoun(salutation)),
    designation: line(raw.designation, EXPERIENCE_LIMITS.short),
    department: line(raw.department, EXPERIENCE_LIMITS.short),
    joiningDate: isoDate(raw.joiningDate),
    endDate: isoDate(raw.endDate),
    issueDate: isoDate(raw.issueDate),
    rating: oneOf(EL_RATINGS, raw.rating, 'satisfactory'),
    remarks: text(raw.remarks, EXPERIENCE_LIMITS.remarks),
    introText: text(raw.introText, EXPERIENCE_LIMITS.paragraph),
    closingText: text(raw.closingText, EXPERIENCE_LIMITS.paragraph),
    signatoryName: line(raw.signatoryName, EXPERIENCE_LIMITS.signatory),
    signatoryCompany: line(raw.signatoryCompany, EXPERIENCE_LIMITS.signatory),
    signatoryDepartment: line(raw.signatoryDepartment, EXPERIENCE_LIMITS.signatory),
    signatoryTitle: line(raw.signatoryTitle, EXPERIENCE_LIMITS.signatory),
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

export function validateExperienceInput(i: ExperienceLetterInput, raw?: Record<string, unknown>): Record<string, string> {
  const e: Record<string, string> = {};
  if (!i.employeeName) e.employeeName = 'Employee name is required.';
  else if (!NAME_RE.test(i.employeeName)) e.employeeName = 'Use letters, spaces, dots, apostrophes or hyphens only.';
  if (!i.designation) e.designation = 'Designation is required.';
  else if (!TEXT_RE.test(i.designation)) e.designation = 'Enter a valid designation (e.g. Frontend Developer).';
  if (i.department && !TEXT_RE.test(i.department)) e.department = 'Enter a valid department.';
  if (i.employeeCode && !CODE_RE.test(i.employeeCode)) e.employeeCode = 'Use letters, digits, / _ or - only.';
  if (i.showEmployeeCode && !i.employeeCode) e.employeeCode = 'Enter the employee ID, or untick “show in letter”.';

  for (const [k, label] of [['joiningDate', 'Joining date'], ['endDate', 'Last working date'], ['issueDate', 'Issue date']] as const) {
    if (typeof raw?.[k] === 'string' && (raw[k] as string).trim() !== '' && !i[k]) e[k] = `${label} is not a valid date.`;
    else if (!i[k]) e[k] = `${label} is required.`;
  }
  if (i.joiningDate && i.endDate && i.endDate < i.joiningDate) e.endDate = 'Last working date cannot be before the joining date.';
  if (i.endDate && i.issueDate && i.issueDate < i.endDate) e.issueDate = 'An experience letter is issued on or after the last working date.';

  if (i.logoMode === 'custom' && !isValidLogoData(i.logoData)) e.logoData = 'Upload a PNG or JPEG logo (max 300 KB).';
  if (i.signatureMode === 'custom' && !isValidLogoData(i.signatureData)) e.signatureData = 'Upload a PNG or JPEG signature (max 300 KB).';
  return e;
}

// ── Formatting (reference style: zero-padded day + ordinal, no superscript) ──
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dd = (d: number) => `${String(d).padStart(2, '0')}${ordinalSuffix(d)}`;

/** Issue date: "Jun 02nd, 2023". */
export function formatElIssueDate(iso: string): string {
  const p = parseLetterDate(iso);
  return p ? `${MONTHS[p.m - 1].slice(0, 3)} ${dd(p.d)}, ${p.y}` : '';
}

/** Service dates: "02nd January 2023". */
export function formatElPeriodDate(iso: string): string {
  const p = parseLetterDate(iso);
  return p ? `${dd(p.d)} ${MONTHS[p.m - 1]} ${p.y}` : '';
}

// ── Content ─────────────────────────────────────────────────────────────────
export interface ExperienceLetterContent {
  title: string;
  issueDate: string;
  intro: LetterRun[];
  remarks: LetterRun[] | null;
  closing: LetterRun[];
  regards: string;
  signatory: { name: string; company: string; department: string; title: string };
  logo: { mode: ImageMode; src: string | null };
  signature: { mode: ImageMode; src: string | null };
  employeeName: string;
}

const FORMS: Record<RlPronoun, { poss: string; obj: string }> = {
  he: { poss: 'his', obj: 'him' },
  she: { poss: 'her', obj: 'her' },
  they: { poss: 'their', obj: 'them' },
};

export function generatedExperience(i: ExperienceLetterInput): { intro: LetterRun[]; closing: LetterRun[] } {
  const f = FORMS[i.pronoun];
  const b = (t: string): LetterRun => ({ text: t, bold: true });
  const t = (s: string): LetterRun => ({ text: s });
  const role = i.designation || 'Employee';
  const intro: LetterRun[] = [t('This is to certify that '), b(`${i.salutation ? `${i.salutation} ` : ''}${i.employeeName}`)];
  if (i.showEmployeeCode && i.employeeCode) intro.push(t(` (Employee ID: ${i.employeeCode})`));
  intro.push(t(` has worked as ${article(role)} `), b(role));
  if (i.department) intro.push(t(' in the '), b(i.department), t(' department'));
  intro.push(t(' from '), b(`${formatElPeriodDate(i.joiningDate)} to ${formatElPeriodDate(i.endDate)}`),
    t(`. During ${f.poss} service, ${f.poss} character and conduct were ${i.rating}.`));
  return { intro, closing: [t(`We wish ${f.obj} all success in ${f.poss} future endeavors.`)] };
}

export function buildExperienceLetter(i: ExperienceLetterInput): ExperienceLetterContent {
  const g = generatedExperience(i);
  return {
    title: 'TO WHOM IT MAY CONCERN',
    issueDate: formatElIssueDate(i.issueDate),
    intro: i.introText ? markupToRunsRl(i.introText) : g.intro,
    remarks: i.remarks ? markupToRunsRl(i.remarks) : null,
    closing: i.closingText ? markupToRunsRl(i.closingText) : g.closing,
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
