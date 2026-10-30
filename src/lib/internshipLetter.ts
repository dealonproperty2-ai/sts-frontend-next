/**
 * Internship Experience Letter — pure content model.
 *
 * One source of truth for the on-screen preview, the print view, the PDF
 * (internshipLetterPdfDoc.tsx) and the API (normalise + validate on the
 * server too). No React, no DB — safe to import anywhere.
 *
 * Wording follows the company's reference letter. Every paragraph can be
 * replaced with edited wording; `**text**` marks bold in edited wording.
 */
import { parseLetterDate, type LetterRun } from '@/lib/appointmentLetter';
import { COMPANY_ADDRESS, COMPANY_EMAIL, COMPANY_NAME, COMPANY_WEBSITE } from '@/lib/hrConstants';

export const INTERN_SALUTATIONS = ['', 'Mr.', 'Ms.', 'Mrs.'] as const;
export const GUARDIAN_RELATIONS = ['', 'S/o', 'D/o', 'W/o', 'C/o'] as const;
export const PRONOUNS = ['he', 'she', 'they'] as const;
export const INTERNSHIP_TYPES = ['Paid Internship', 'Unpaid Internship', 'Internship'] as const;
export const PERFORMANCE_RATINGS = ['outstanding', 'excellent', 'very good', 'good', 'satisfactory'] as const;
export const DATE_STYLES = ['month', 'day'] as const;
export const LOGO_MODES = ['default', 'custom', 'none'] as const;
/** Paragraphs whose wording can be edited (remarks is free text already). */
export const EDITABLE_PARAGRAPHS = ['intro', 'work', 'performance', 'closing'] as const;

export type Salutation = (typeof INTERN_SALUTATIONS)[number];
export type GuardianRelation = (typeof GUARDIAN_RELATIONS)[number];
export type Pronoun = (typeof PRONOUNS)[number];
export type PerformanceRating = (typeof PERFORMANCE_RATINGS)[number];
export type DateStyle = (typeof DATE_STYLES)[number];
export type LogoMode = (typeof LOGO_MODES)[number];
export type EditableParagraph = (typeof EDITABLE_PARAGRAPHS)[number];

export const INTERNSHIP_LIMITS = {
  name: 100, role: 100, type: 40, summary: 300, technologies: 400, techItems: 25, remarks: 1500,
  paragraph: 2000, signatory: 80, logoChars: 400_000,
};

export const DEFAULT_WORK_SUMMARY = 'various software development projects';
export const DEFAULT_SIGNATORY_TITLE = 'Human Resource Department';
export const DEFAULT_SIGNATORY_SUBTITLE = 'Authorized Signatory';

export interface InternshipLetterInput {
  employeeId: string | null;
  salutation: Salutation;
  internName: string;
  relation: GuardianRelation;
  guardianSalutation: Salutation;
  guardianName: string;
  pronoun: Pronoun;
  internshipType: string;
  role: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  letterDate: string;  // YYYY-MM-DD
  dateStyle: DateStyle;
  workSummary: string;
  technologies: string;
  performance: PerformanceRating;
  remarks: string;
  /** Edited wording per paragraph; '' = generated wording. */
  introText: string;
  workText: string;
  performanceText: string;
  closingText: string;
  signatoryName: string;
  signatoryTitle: string;
  signatorySubtitle: string;
  logoMode: LogoMode;
  /** data:image/png|jpeg;base64,… — only when logoMode is 'custom'. */
  logoData: string;
}

// ── Branding (from the verified company configuration) ──────────────────────
const addressParts = COMPANY_ADDRESS.split(',').map((p) => p.trim());
export const BRAND = {
  name: COMPANY_NAME.toUpperCase(),                       // STEP TO SOFT PVT. LTD.
  bodyName: 'Step To Soft Pvt. Ltd.',                      // as written in the reference body text
  addressLine1: addressParts.slice(0, 2).join(', '),
  addressLine2: addressParts.slice(2).join(', '),
  email: COMPANY_EMAIL,
  website: COMPANY_WEBSITE,
  address: COMPANY_ADDRESS,
};

// ── Normalisation ───────────────────────────────────────────────────────────
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const line = (v: unknown, max: number) => str(v, max).replace(/\s+/g, ' ');
/** Multi-line text: trims each line, keeps single line breaks, collapses runs of blank lines. */
const text = (v: unknown, max: number) =>
  str(v, max).split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{2,}/g, '\n');
/** YYYY-MM-DD of a real calendar day (rejects e.g. 2026-02-30), else ''. */
const isoDate = (v: unknown) => {
  const s = typeof v === 'string' ? v.slice(0, 10) : '';
  const p = parseLetterDate(s);
  if (!p || s.length !== 10) return '';
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d));
  return d.getUTCMonth() === p.m - 1 && d.getUTCDate() === p.d ? s : '';
};
const oneOf = <T extends readonly string[]>(list: T, v: unknown, fallback: T[number]): T[number] =>
  (list as readonly string[]).includes(v as string) ? (v as T[number]) : fallback;

export function defaultPronoun(salutation: Salutation): Pronoun {
  return salutation === 'Mr.' ? 'he' : salutation === 'Ms.' || salutation === 'Mrs.' ? 'she' : 'they';
}

/** Coerces any request/form payload into a clean input (never throws). */
export function normalizeInternshipInput(raw: Record<string, unknown>): InternshipLetterInput {
  const salutation = oneOf(INTERN_SALUTATIONS, raw.salutation, '');
  const logoMode = oneOf(LOGO_MODES, raw.logoMode, 'default');
  return {
    employeeId: typeof raw.employeeId === 'string' && /^[a-f0-9]{24}$/i.test(raw.employeeId) ? raw.employeeId : null,
    salutation,
    internName: line(raw.internName, INTERNSHIP_LIMITS.name),
    relation: oneOf(GUARDIAN_RELATIONS, raw.relation, ''),
    guardianSalutation: oneOf(INTERN_SALUTATIONS, raw.guardianSalutation, ''),
    guardianName: line(raw.guardianName, INTERNSHIP_LIMITS.name),
    pronoun: oneOf(PRONOUNS, raw.pronoun, defaultPronoun(salutation)),
    internshipType: line(raw.internshipType, INTERNSHIP_LIMITS.type),
    role: line(raw.role, INTERNSHIP_LIMITS.role),
    startDate: isoDate(raw.startDate),
    endDate: isoDate(raw.endDate),
    letterDate: isoDate(raw.letterDate),
    dateStyle: oneOf(DATE_STYLES, raw.dateStyle, 'month'),
    workSummary: line(raw.workSummary, INTERNSHIP_LIMITS.summary),
    technologies: line(raw.technologies, INTERNSHIP_LIMITS.technologies),
    performance: oneOf(PERFORMANCE_RATINGS, raw.performance, 'satisfactory'),
    remarks: text(raw.remarks, INTERNSHIP_LIMITS.remarks),
    introText: text(raw.introText, INTERNSHIP_LIMITS.paragraph),
    workText: text(raw.workText, INTERNSHIP_LIMITS.paragraph),
    performanceText: text(raw.performanceText, INTERNSHIP_LIMITS.paragraph),
    closingText: text(raw.closingText, INTERNSHIP_LIMITS.paragraph),
    signatoryName: line(raw.signatoryName, INTERNSHIP_LIMITS.signatory),
    signatoryTitle: line(raw.signatoryTitle, INTERNSHIP_LIMITS.signatory),
    signatorySubtitle: line(raw.signatorySubtitle, INTERNSHIP_LIMITS.signatory),
    logoMode,
    logoData: logoMode === 'custom' && typeof raw.logoData === 'string' ? raw.logoData.trim() : '',
  };
}

// ── Validation ──────────────────────────────────────────────────────────────
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const ROLE_RE = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .,'&/()+#-]*$/u;
const LOGO_RE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/;

/** True when a data URL really holds a PNG or JPEG of the declared type (magic bytes). */
export function isValidLogoData(dataUrl: string): boolean {
  const m = LOGO_RE.exec(dataUrl);
  if (!m || dataUrl.length > INTERNSHIP_LIMITS.logoChars) return false;
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1, dataUrl.indexOf(',') + 13);
  let head: string;
  try { head = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary'); } catch { return false; }
  const bytes = [...head].map((c) => c.charCodeAt(0));
  return m[1] === 'png'
    ? bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function splitTechnologies(s: string): string[] {
  const seen = new Set<string>();
  return s.split(/[,;\n]/).map((t) => t.trim()).filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
}

/** Returns field → message for every problem; empty object means valid. */
export function validateInternshipInput(i: InternshipLetterInput, raw?: Record<string, unknown>): Record<string, string> {
  const e: Record<string, string> = {};
  if (!i.internName) e.internName = 'Intern name is required.';
  else if (!NAME_RE.test(i.internName)) e.internName = 'Use letters, spaces, dots, apostrophes or hyphens only.';
  if (i.relation && !i.guardianName) e.guardianName = `Enter the name for "${i.relation}", or set the relation to none.`;
  else if (!i.relation && i.guardianName) e.relation = 'Choose S/o, D/o, W/o or C/o — or clear the parent/guardian name.';
  else if (i.guardianName && !NAME_RE.test(i.guardianName)) e.guardianName = 'Use letters, spaces, dots, apostrophes or hyphens only.';
  if (!i.role) e.role = 'Internship role is required.';
  else if (!ROLE_RE.test(i.role)) e.role = 'Enter a valid role (e.g. Software Developer Intern).';
  if (i.internshipType && !ROLE_RE.test(i.internshipType)) e.internshipType = 'Enter a valid internship type.';

  const badDate = (k: 'startDate' | 'endDate' | 'letterDate') => typeof raw?.[k] === 'string' && (raw[k] as string).trim() !== '' && !i[k];
  for (const [k, label] of [['startDate', 'Start date'], ['endDate', 'End date'], ['letterDate', 'Letter date']] as const) {
    if (badDate(k)) e[k] = `${label} is not a valid date.`;
    else if (!i[k]) e[k] = `${label} is required.`;
  }
  if (i.startDate && i.endDate && i.endDate < i.startDate) e.endDate = 'End date cannot be before the start date.';
  if (i.endDate && i.letterDate && i.letterDate < i.endDate) e.letterDate = 'An experience letter is dated on or after the internship end date.';

  const techs = splitTechnologies(i.technologies);
  if (techs.length > INTERNSHIP_LIMITS.techItems) e.technologies = `List at most ${INTERNSHIP_LIMITS.techItems} technologies.`;
  else if (techs.some((t) => t.length > 40)) e.technologies = 'Each technology must be 40 characters or fewer.';

  if (i.logoMode === 'custom' && !isValidLogoData(i.logoData)) e.logoData = 'Upload a PNG or JPEG logo (max 300 KB).';
  return e;
}

// ── Formatting ──────────────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Reference style: "30 June 2026". */
export function formatLetterDate(iso: string): string {
  const p = parseLetterDate(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : '';
}

/** Internship period dates: "January 2026" (month style, as the reference) or "05 January 2026". */
export function formatPeriodDate(iso: string, style: DateStyle): string {
  const p = parseLetterDate(iso);
  if (!p) return '';
  return style === 'month' ? `${MONTHS[p.m - 1]} ${p.y}` : `${String(p.d).padStart(2, '0')} ${MONTHS[p.m - 1]} ${p.y}`;
}

/** "A", "A and B", "A, B, and C" (serial comma, as in the reference). */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** Indefinite article by sound: "an Intern", "a UI/UX Designer", "an HR Intern", "a Software Developer Intern". */
export function article(word: string): 'a' | 'an' {
  const w = word.trim();
  const acronym = /^[A-Z]{2,}\b/.test(w) || /^[A-Z](?=[/\-.]|$)/.test(w);
  if (acronym) return /^[AEFHILMNORSX]/.test(w) ? 'an' : 'a';
  if (/^(?:eu|one\b|once\b|uni|us[aeiu]|ut)/i.test(w)) return 'a';
  return /^(?:[aeio]|un|um|up|hour|honest|honou?r)/i.test(w) ? 'an' : 'a';
}

const PRONOUN_FORMS: Record<Pronoun, { s: string; S: string; poss: string; Poss: string; obj: string }> = {
  he: { s: 'he', S: 'He', poss: 'his', Poss: 'His', obj: 'him' },
  she: { s: 'she', S: 'She', poss: 'her', Poss: 'Her', obj: 'her' },
  they: { s: 'they', S: 'They', poss: 'their', Poss: 'Their', obj: 'them' },
};

// ── Bold markup for edited wording ──────────────────────────────────────────
/** "plain **bold** plain" → runs. Unpaired ** is kept as literal text. */
export function markupToRuns(s: string): LetterRun[] {
  const runs: LetterRun[] = [];
  const re = /\*\*(.+?)\*\*/gs;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) runs.push({ text: s.slice(last, m.index) });
    runs.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) runs.push({ text: s.slice(last) });
  return runs.filter((r) => r.text);
}

export function runsToMarkup(runs: LetterRun[]): string {
  return runs.map((r) => (r.bold && r.text.trim() ? `**${r.text}**` : r.text)).join('');
}

// ── Content ─────────────────────────────────────────────────────────────────
export interface InternshipLetterContent {
  letterDate: string;
  title: string;
  subject: string;
  paragraphs: LetterRun[][];
  regards: string;
  forCompany: string;
  signatory: { name: string; title: string; subtitle: string };
  logo: { mode: LogoMode; src: string | null };
  internName: string;
}

/** The generated wording of each editable paragraph (used for the preview and as the start for edits). */
export function generatedParagraphs(i: InternshipLetterInput): Record<EditableParagraph, LetterRun[]> {
  const p = PRONOUN_FORMS[i.pronoun];
  const b = (t: string): LetterRun => ({ text: t, bold: true });
  const t = (s: string): LetterRun => ({ text: s });
  const type = i.internshipType || 'Internship';
  const role = i.role || 'Intern';

  const intro: LetterRun[] = [t('This is to certify that '), ...(i.salutation ? [t(`${i.salutation} `)] : []), b(i.internName.toUpperCase())];
  if (i.relation && i.guardianName) {
    intro.push(t(`, ${i.relation} ${i.guardianSalutation ? `${i.guardianSalutation} ` : ''}`), b(i.guardianName.toUpperCase()));
  }
  intro.push(
    t(`, has successfully completed ${p.poss} ${type} as ${article(role)} `), b(role),
    t(` at ${BRAND.bodyName} from `), b(formatPeriodDate(i.startDate, i.dateStyle)), t(' to '), b(formatPeriodDate(i.endDate, i.dateStyle)), t('.'),
  );

  const techs = splitTechnologies(i.technologies);
  const work = [t(
    `During the internship period, ${p.s} worked on ${i.workSummary || DEFAULT_WORK_SUMMARY} and gained `
    + (techs.length ? `practical experience in ${joinList(techs)}.` : 'valuable practical experience.')
    + ` ${p.S} performed ${p.poss} assigned responsibilities with dedication, sincerity, and professionalism.`,
  )];
  const performance = [t(`${p.Poss} overall performance, conduct, and commitment towards work were found to be ${i.performance} throughout the internship.`)];
  const closing = [t(`We appreciate ${p.poss} contribution to the organization and wish ${p.obj} every success in ${p.poss} future career.`)];
  return { intro, work, performance, closing };
}

const OVERRIDE_KEY: Record<EditableParagraph, 'introText' | 'workText' | 'performanceText' | 'closingText'> = {
  intro: 'introText', work: 'workText', performance: 'performanceText', closing: 'closingText',
};
export const overrideKey = (k: EditableParagraph) => OVERRIDE_KEY[k];

export function buildInternshipLetter(i: InternshipLetterInput): InternshipLetterContent {
  const gen = generatedParagraphs(i);
  const para = (k: EditableParagraph) => (i[OVERRIDE_KEY[k]] ? markupToRuns(i[OVERRIDE_KEY[k]]) : gen[k]);
  const paragraphs = [para('intro'), para('work'), para('performance')];
  if (i.remarks) paragraphs.push(markupToRuns(i.remarks));
  paragraphs.push(para('closing'));

  return {
    letterDate: formatLetterDate(i.letterDate),
    title: 'INTERNSHIP EXPERIENCE LETTER',
    subject: 'TO WHOM IT MAY CONCERN',
    paragraphs,
    regards: 'Regards,',
    forCompany: `For ${BRAND.name}`,
    signatory: {
      name: i.signatoryName,
      title: i.signatoryTitle || DEFAULT_SIGNATORY_TITLE,
      subtitle: i.signatorySubtitle || DEFAULT_SIGNATORY_SUBTITLE,
    },
    logo: { mode: i.logoMode, src: i.logoMode === 'custom' && i.logoData ? i.logoData : null },
    internName: i.internName,
  };
}
