import mongoose, { Schema, Document, Types } from 'mongoose';
import { EMPLOYMENT_TYPES, OFFER_SALUTATIONS, OFFER_STATUSES, type OfferStatus } from '@/lib/offerLetter';

/**
 * An offer of employment. Candidate details are stored as a SNAPSHOT on the
 * offer (optionally linked to an existing Employee), so later edits to an
 * employee record never rewrite a historical offer, and no employee record is
 * created or modified by the offer workflow.
 */
export interface IOfferLetter extends Document {
  offerNumber: string;
  offerYear: number;
  offerSeq: number;
  employeeId: Types.ObjectId | null;
  employeeCode: string;
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
  joiningDate: Date;
  issueDate: Date;
  validUntil: Date;
  monthlyGross: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  annualCtc: number | null;
  benefits: string;
  incentives: string;
  probationPeriod: string;
  workingHours: string;
  additionalTerms: string;
  hrName: string;
  /** Candidate acceptance section — optional; absent on offers created before these fields existed. */
  acceptanceDate: Date | null;
  acceptancePlace: string;
  status: OfferStatus;
  statusHistory: Array<{ status: OfferStatus; at: Date; by: string }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const OfferLetterSchema = new Schema<IOfferLetter>(
  {
    offerNumber:      { type: String, required: true, unique: true },
    offerYear:        { type: Number, required: true },
    offerSeq:         { type: Number, required: true },
    employeeId:       { type: Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    employeeCode:     { type: String, default: '' },
    salutation:       { type: String, enum: [...OFFER_SALUTATIONS], default: '' },
    candidateName:    { type: String, required: true, trim: true },
    candidateEmail:   { type: String, default: '', trim: true, lowercase: true },
    candidatePhone:   { type: String, default: '', trim: true },
    candidateAddress: { type: String, default: '' },
    department:       { type: String, required: true, trim: true },
    designation:      { type: String, required: true, trim: true },
    employmentType:   { type: String, enum: [...EMPLOYMENT_TYPES], required: true },
    workLocation:     { type: String, default: '', trim: true },
    reportingManager: { type: String, default: '', trim: true },
    joiningDate:      { type: Date, required: true },
    issueDate:        { type: Date, required: true },
    validUntil:       { type: Date, required: true },
    monthlyGross:     { type: Number, required: true, min: 0 },
    basicSalary:      { type: Number, default: 0, min: 0 },
    hra:              { type: Number, default: 0, min: 0 },
    specialAllowance: { type: Number, default: 0, min: 0 },
    annualCtc:        { type: Number, default: null, min: 0 },
    benefits:         { type: String, default: '' },
    incentives:       { type: String, default: '' },
    probationPeriod:  { type: String, default: '' },
    workingHours:     { type: String, default: '' },
    additionalTerms:  { type: String, default: '' },
    hrName:           { type: String, default: 'Naheed Zakia', trim: true },
    acceptanceDate:   { type: Date, default: null },
    acceptancePlace:  { type: String, default: '', trim: true },
    status:          { type: String, enum: [...OFFER_STATUSES], default: 'draft', index: true },
    statusHistory:    {
      type: [{ status: { type: String, enum: [...OFFER_STATUSES] }, at: Date, by: String, _id: false }],
      default: [],
    },
    createdBy:        { type: String, default: '' },
  },
  { timestamps: true }
);

OfferLetterSchema.index({ offerYear: 1, offerSeq: 1 }, { unique: true });
OfferLetterSchema.index({ createdAt: -1 });

// In development the dev server re-evaluates this module after edits while the
// mongoose singleton keeps the previously compiled model — whose schema would
// silently strip any newly added fields (e.g. acceptanceDate/acceptancePlace) on
// save. Recompile from the current schema there; production compiles once.
if (process.env.NODE_ENV !== 'production' && mongoose.models.OfferLetter) mongoose.deleteModel('OfferLetter');

export default (mongoose.models.OfferLetter as mongoose.Model<IOfferLetter>) ||
  mongoose.model<IOfferLetter>('OfferLetter', OfferLetterSchema);
