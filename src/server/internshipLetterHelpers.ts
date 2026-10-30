import mongoose from 'mongoose';
import Employee from '@/server/models/Employee';
import type { IInternshipLetter } from '@/server/models/InternshipLetter';
import type { InternshipLetterInput } from '@/lib/internshipLetter';

const FIELDS = [
  'salutation', 'internName', 'relation', 'guardianSalutation', 'guardianName', 'pronoun', 'internshipType', 'role',
  'dateStyle', 'workSummary', 'technologies', 'performance', 'remarks', 'introText', 'workText', 'performanceText', 'closingText',
  'signatoryName', 'signatoryTitle', 'signatorySubtitle', 'logoMode', 'logoData',
] as const;
const DATES = ['startDate', 'endDate', 'letterDate'] as const;

/** Stored letter → the shared input shape (dates as YYYY-MM-DD). */
export function letterToInput(o: Pick<IInternshipLetter, keyof IInternshipLetter> | Record<string, unknown>): Record<string, unknown> {
  const r = o as Record<string, unknown>;
  const d = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'string' ? v.slice(0, 10) : '');
  const out: Record<string, unknown> = { employeeId: r.employeeId ? String(r.employeeId) : null };
  for (const k of FIELDS) out[k] = r[k] ?? '';
  for (const k of DATES) out[k] = d(r[k]);
  return out;
}

/** Validated input → document fields (dates stored as UTC midnight of the calendar day). */
export function inputToDoc(i: InternshipLetterInput) {
  const doc: Record<string, unknown> = { employeeId: i.employeeId ? new mongoose.Types.ObjectId(i.employeeId) : null };
  for (const k of FIELDS) doc[k] = i[k];
  for (const k of DATES) doc[k] = new Date(`${i[k]}T00:00:00.000Z`);
  return doc;
}

/** Employee code for the snapshot; null without a link; 'missing' when the id is unknown. */
export async function resolveEmployeeLink(employeeId: string | null): Promise<{ code: string } | null | 'missing'> {
  if (!employeeId) return null;
  const emp = (await Employee.findOne({ _id: employeeId, deletedAt: null }).select('employeeId').lean()) as { employeeId?: string } | null;
  return emp ? { code: emp.employeeId ?? '' } : 'missing';
}
