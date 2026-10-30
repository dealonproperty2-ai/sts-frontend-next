import mongoose from 'mongoose';
import type { IExperienceLetter } from '@/server/models/ExperienceLetter';
import type { ExperienceLetterInput } from '@/lib/experienceLetter';

export { resolveEmployeeLink } from '@/server/internshipLetterHelpers';

const FIELDS = [
  'employeeCode', 'showEmployeeCode', 'salutation', 'employeeName', 'pronoun', 'designation', 'department', 'rating', 'remarks',
  'introText', 'closingText', 'signatoryName', 'signatoryCompany', 'signatoryDepartment', 'signatoryTitle',
  'logoMode', 'logoData', 'signatureMode', 'signatureData',
] as const;
const DATES = ['joiningDate', 'endDate', 'issueDate'] as const;

/** Stored letter → the shared input shape (dates as YYYY-MM-DD). */
export function letterToInput(o: Pick<IExperienceLetter, keyof IExperienceLetter> | Record<string, unknown>): Record<string, unknown> {
  const r = o as Record<string, unknown>;
  const d = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'string' ? v.slice(0, 10) : '');
  const out: Record<string, unknown> = { employeeId: r.employeeId ? String(r.employeeId) : null };
  for (const k of FIELDS) out[k] = r[k] ?? '';
  for (const k of DATES) out[k] = d(r[k]);
  return out;
}

/** Validated input → document fields (dates stored as UTC midnight of the calendar day). */
export function inputToDoc(i: ExperienceLetterInput) {
  const doc: Record<string, unknown> = { employeeId: i.employeeId ? new mongoose.Types.ObjectId(i.employeeId) : null };
  for (const k of FIELDS) doc[k] = i[k];
  for (const k of DATES) doc[k] = new Date(`${i[k]}T00:00:00.000Z`);
  return doc;
}
