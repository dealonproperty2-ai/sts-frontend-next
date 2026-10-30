import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  DATE_STYLES, GUARDIAN_RELATIONS, INTERN_SALUTATIONS, LOGO_MODES, PERFORMANCE_RATINGS, PRONOUNS,
  type DateStyle, type GuardianRelation, type LogoMode, type PerformanceRating, type Pronoun, type Salutation,
} from '@/lib/internshipLetter';

/**
 * A generated Internship Experience Letter. Intern details are a SNAPSHOT
 * (optionally linked to an Employee record, which is only read, never
 * changed), so the letter can be reopened, edited and re-downloaded exactly.
 */
export interface IInternshipLetter extends Document {
  employeeId: Types.ObjectId | null;
  employeeCode: string;
  salutation: Salutation;
  internName: string;
  relation: GuardianRelation;
  guardianSalutation: Salutation;
  guardianName: string;
  pronoun: Pronoun;
  internshipType: string;
  role: string;
  startDate: Date;
  endDate: Date;
  letterDate: Date;
  dateStyle: DateStyle;
  workSummary: string;
  technologies: string;
  performance: PerformanceRating;
  remarks: string;
  introText: string;
  workText: string;
  performanceText: string;
  closingText: string;
  signatoryName: string;
  signatoryTitle: string;
  signatorySubtitle: string;
  logoMode: LogoMode;
  logoData: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const InternshipLetterSchema = new Schema<IInternshipLetter>(
  {
    employeeId:         { type: Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    employeeCode:       { type: String, default: '' },
    salutation:         { type: String, enum: [...INTERN_SALUTATIONS], default: '' },
    internName:         { type: String, required: true, trim: true },
    relation:           { type: String, enum: [...GUARDIAN_RELATIONS], default: '' },
    guardianSalutation: { type: String, enum: [...INTERN_SALUTATIONS], default: '' },
    guardianName:       { type: String, default: '', trim: true },
    pronoun:            { type: String, enum: [...PRONOUNS], default: 'they' },
    internshipType:     { type: String, default: '', trim: true },
    role:               { type: String, required: true, trim: true },
    startDate:          { type: Date, required: true },
    endDate:            { type: Date, required: true },
    letterDate:         { type: Date, required: true },
    dateStyle:          { type: String, enum: [...DATE_STYLES], default: 'month' },
    workSummary:        { type: String, default: '' },
    technologies:       { type: String, default: '' },
    performance:        { type: String, enum: [...PERFORMANCE_RATINGS], default: 'satisfactory' },
    remarks:            { type: String, default: '' },
    introText:          { type: String, default: '' },
    workText:           { type: String, default: '' },
    performanceText:    { type: String, default: '' },
    closingText:        { type: String, default: '' },
    signatoryName:      { type: String, default: '', trim: true },
    signatoryTitle:     { type: String, default: '', trim: true },
    signatorySubtitle:  { type: String, default: '', trim: true },
    logoMode:           { type: String, enum: [...LOGO_MODES], default: 'default' },
    logoData:           { type: String, default: '' },
    createdBy:          { type: String, default: '' },
  },
  { timestamps: true }
);

InternshipLetterSchema.index({ createdAt: -1 });

// In development the dev server re-evaluates this module after edits while the
// mongoose singleton keeps the previously compiled model — whose schema would
// silently strip newly added fields on save. Recompile there; production compiles once.
if (process.env.NODE_ENV !== 'production' && mongoose.models.InternshipLetter) mongoose.deleteModel('InternshipLetter');

export default (mongoose.models.InternshipLetter as mongoose.Model<IInternshipLetter>) ||
  mongoose.model<IInternshipLetter>('InternshipLetter', InternshipLetterSchema);
