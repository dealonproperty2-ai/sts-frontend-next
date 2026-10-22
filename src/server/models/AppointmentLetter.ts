import mongoose, { Schema, Document, Types } from 'mongoose';

export const SALUTATIONS = ['', 'Mr.', 'Ms.', 'Mrs.'] as const;
export type SalutationValue = (typeof SALUTATIONS)[number];

/** Request value → stored salutation; anything unrecognised is stored as '' (not set). */
export function toSalutation(v: unknown): SalutationValue {
  return (SALUTATIONS as readonly string[]).includes(v as string) ? (v as SalutationValue) : '';
}

/** Request value → trimmed single-line text (max `max` chars); non-strings become ''. */
export function toCleanText(v: unknown, max = 100): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/** Request value → optional date; empty or unparseable input is stored as null, never "Invalid Date". */
export function toOptionalDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface IAppointmentLetter extends Document {
  employeeId: Types.ObjectId;
  offerDate: Date;
  /** Date of the candidate's interview, quoted in the letter's opening paragraph. */
  interviewDate: Date | null;
  joiningDate: Date;
  designation: string;
  department: string;
  salary: number;
  workLocation: string;
  probationPeriod: string;
  hrName: string;
  /** Courtesy title for the salutation ("Dear Mr. …") and acceptance (S/O vs D/O). */
  salutation: SalutationValue;
  /** Employee acceptance section: date the employee signs ("Date: DD-MM-YYYY") — not the joining or issue date. */
  acceptanceDate: Date | null;
  /** Employee acceptance section: place of signing ("Place: <city>"). */
  acceptancePlace: string;
  customTerms: string;
  status: 'generated' | 'sent' | 'downloaded';
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentLetterSchema = new Schema<IAppointmentLetter>(
  {
    employeeId:      { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    offerDate:       { type: Date, required: true },
    interviewDate:   { type: Date, default: null },
    joiningDate:     { type: Date, required: true },
    designation:     { type: String, required: true, trim: true },
    department:      { type: String, default: '', trim: true },
    salary:          { type: Number, required: true, min: 0 },
    workLocation:    { type: String, default: '', trim: true },
    probationPeriod: { type: String, default: '3 (Three) months', trim: true },
    hrName:          { type: String, default: 'Naheed Zakia', trim: true },
    salutation:      { type: String, enum: [...SALUTATIONS], default: '' },
    acceptanceDate:  { type: Date, default: null },
    acceptancePlace: { type: String, default: '', trim: true, maxlength: 100 },
    customTerms:     { type: String, default: '' },
    status:          { type: String, enum: ['generated', 'sent', 'downloaded'], default: 'generated' },
  },
  { timestamps: true }
);

export default mongoose.models.AppointmentLetter ||
  mongoose.model<IAppointmentLetter>('AppointmentLetter', AppointmentLetterSchema);
