import mongoose, { Schema, Document, Types } from 'mongoose';
import { IMAGE_MODES, RL_PRONOUNS, RL_SALUTATIONS, type ImageMode, type RlPronoun, type RlSalutation } from '@/lib/relievingLetter';

/**
 * A generated Relieving Letter. Employee details are a SNAPSHOT (optionally
 * linked to an Employee record, which is only read, never changed), so the
 * letter can be reopened, edited and re-downloaded exactly as issued.
 */
export interface IRelievingLetter extends Document {
  employeeId: Types.ObjectId | null;
  employeeCode: string;
  showEmployeeCode: boolean;
  salutation: RlSalutation;
  employeeName: string;
  pronoun: RlPronoun;
  designation: string;
  department: string;
  joiningDate: Date;
  relievingDate: Date;
  issueDate: Date;
  remarks: string;
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
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const RelievingLetterSchema = new Schema<IRelievingLetter>(
  {
    employeeId:          { type: Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    employeeCode:        { type: String, default: '', trim: true },
    showEmployeeCode:    { type: Boolean, default: false },
    salutation:          { type: String, enum: [...RL_SALUTATIONS], default: '' },
    employeeName:        { type: String, required: true, trim: true },
    pronoun:             { type: String, enum: [...RL_PRONOUNS], default: 'they' },
    designation:         { type: String, required: true, trim: true },
    department:          { type: String, default: '', trim: true },
    joiningDate:         { type: Date, required: true },
    relievingDate:       { type: Date, required: true },
    issueDate:           { type: Date, required: true },
    remarks:             { type: String, default: '' },
    greetingText:        { type: String, default: '' },
    introText:           { type: String, default: '' },
    closingText:         { type: String, default: '' },
    signatoryName:       { type: String, default: '', trim: true },
    signatoryCompany:    { type: String, default: '', trim: true },
    signatoryDepartment: { type: String, default: '', trim: true },
    signatoryTitle:      { type: String, default: '', trim: true },
    logoMode:            { type: String, enum: [...IMAGE_MODES], default: 'default' },
    logoData:            { type: String, default: '' },
    signatureMode:       { type: String, enum: [...IMAGE_MODES], default: 'default' },
    signatureData:       { type: String, default: '' },
    createdBy:           { type: String, default: '' },
  },
  { timestamps: true }
);

RelievingLetterSchema.index({ createdAt: -1 });

// In development the dev server re-evaluates this module after edits while the
// mongoose singleton keeps the previously compiled model — whose schema would
// silently strip newly added fields on save. Recompile there; production compiles once.
if (process.env.NODE_ENV !== 'production' && mongoose.models.RelievingLetter) mongoose.deleteModel('RelievingLetter');

export default (mongoose.models.RelievingLetter as mongoose.Model<IRelievingLetter>) ||
  mongoose.model<IRelievingLetter>('RelievingLetter', RelievingLetterSchema);
