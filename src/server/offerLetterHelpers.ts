import mongoose from 'mongoose';
import Employee from '@/server/models/Employee';
import OfferLetter, { type IOfferLetter } from '@/server/models/OfferLetter';
import { formatOfferNumber, type OfferLetterInput } from '@/lib/offerLetter';

/** Escape user input for use inside a RegExp (search must never be interpreted as a pattern). */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Stored offer → the shared input shape (dates as YYYY-MM-DD). */
export function offerToInput(o: Pick<IOfferLetter, keyof IOfferLetter> | Record<string, unknown>): Record<string, unknown> {
  const d = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'string' ? v.slice(0, 10) : '');
  const r = o as Record<string, unknown>;
  return {
    employeeId: r.employeeId ? String(r.employeeId) : null,
    salutation: r.salutation, candidateName: r.candidateName, candidateEmail: r.candidateEmail, candidatePhone: r.candidatePhone,
    candidateAddress: r.candidateAddress, department: r.department, designation: r.designation, employmentType: r.employmentType,
    workLocation: r.workLocation, reportingManager: r.reportingManager,
    joiningDate: d(r.joiningDate), issueDate: d(r.issueDate), validUntil: d(r.validUntil),
    monthlyGross: r.monthlyGross, basicSalary: r.basicSalary, hra: r.hra, specialAllowance: r.specialAllowance, annualCtc: r.annualCtc,
    benefits: r.benefits, incentives: r.incentives, probationPeriod: r.probationPeriod, workingHours: r.workingHours,
    additionalTerms: r.additionalTerms, hrName: r.hrName,
    acceptanceDate: d(r.acceptanceDate), acceptancePlace: r.acceptancePlace ?? '',
  };
}

/** Acceptance fields → document fields (empty date stored as null). */
export function acceptanceToDoc(i: Pick<OfferLetterInput, 'acceptanceDate' | 'acceptancePlace'>) {
  return {
    acceptanceDate: i.acceptanceDate ? new Date(`${i.acceptanceDate}T00:00:00.000Z`) : null,
    acceptancePlace: i.acceptancePlace,
  };
}

/** Validated input → document fields (dates stored as UTC midnight of the calendar day). */
export function inputToDoc(i: OfferLetterInput) {
  const date = (s: string) => new Date(`${s}T00:00:00.000Z`);
  return {
    employeeId: i.employeeId ? new mongoose.Types.ObjectId(i.employeeId) : null,
    salutation: i.salutation, candidateName: i.candidateName, candidateEmail: i.candidateEmail, candidatePhone: i.candidatePhone,
    candidateAddress: i.candidateAddress, department: i.department, designation: i.designation, employmentType: i.employmentType,
    workLocation: i.workLocation, reportingManager: i.reportingManager,
    joiningDate: date(i.joiningDate), issueDate: date(i.issueDate), validUntil: date(i.validUntil),
    monthlyGross: i.monthlyGross, basicSalary: i.basicSalary, hra: i.hra, specialAllowance: i.specialAllowance, annualCtc: i.annualCtc,
    benefits: i.benefits, incentives: i.incentives, probationPeriod: i.probationPeriod, workingHours: i.workingHours,
    additionalTerms: i.additionalTerms, hrName: i.hrName,
    ...acceptanceToDoc(i),
  };
}

/**
 * Resolves an optional employee link. Returns the employee code for the
 * snapshot, null when there is no link, or 'missing' when the id is unknown.
 */
export async function resolveEmployeeLink(employeeId: string | null): Promise<{ code: string } | null | 'missing'> {
  if (!employeeId) return null;
  const emp = (await Employee.findOne({ _id: employeeId, deletedAt: null }).select('employeeId').lean()) as { employeeId?: string } | null;
  return emp ? { code: emp.employeeId ?? '' } : 'missing';
}

/**
 * Creates an offer with the next number for the year. The {offerYear, offerSeq}
 * unique index makes concurrent creations safe: a clash simply retries with the
 * next sequence number.
 */
export async function createWithNextNumber(fields: Record<string, unknown>, now = new Date()) {
  const year = now.getFullYear();
  for (let attempt = 0; attempt < 6; attempt++) {
    const last = await OfferLetter.findOne({ offerYear: year }).sort({ offerSeq: -1 }).select('offerSeq').lean();
    const seq = (last?.offerSeq ?? 0) + 1 + attempt;
    try {
      return await OfferLetter.create({ ...fields, offerYear: year, offerSeq: seq, offerNumber: formatOfferNumber(year, seq) });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  throw new Error('Could not allocate an offer number, please retry');
}
