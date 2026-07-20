import mongoose, { Schema, models, model } from 'mongoose';

// Developer resume repository ("Active Resume" module, /admin/active-resumes).
// Distinct from the Resume model, which powers the structured Resume Builder.
// Uploaded files are referenced the same way Bill does (url/name/type/size).

export const DEVELOPER_TYPES = [
  'Full Stack',
  'MERN Stack',
  'React',
  'Next.js',
  'Node.js',
  'Java',
  'Python',
  'React Native',
  'Angular',
  'Other',
] as const;

export const RESUME_STATUSES = ['active', 'inactive'] as const;

const DeveloperResumeSchema = new Schema(
  {
    name:            { type: String, required: true, trim: true },
    developerType:   { type: String, required: true, enum: DEVELOPER_TYPES, default: 'Other' },
    // Numeric years so the list can sort/filter properly; the UI renders "X+ Years".
    experienceYears: { type: Number, default: 0, min: 0, max: 60 },
    primarySkill:    { type: String, default: '', trim: true },
    skills:          { type: [String], default: [] },

    resumeUrl:       { type: String, default: '' },
    resumeName:      { type: String, default: '' },
    resumeType:      { type: String, default: '' },
    resumeSize:      { type: Number, default: 0 },

    profileImageUrl: { type: String, default: '' },

    status:          { type: String, enum: RESUME_STATUSES, default: 'active' },
    notes:           { type: String, default: '' },
  },
  { timestamps: true }
);

DeveloperResumeSchema.index({ status: 1, updatedAt: -1 });
DeveloperResumeSchema.index({ developerType: 1 });

export type DeveloperResumeDoc = mongoose.InferSchemaType<typeof DeveloperResumeSchema>;

export default (models.DeveloperResume as mongoose.Model<DeveloperResumeDoc>) ||
  model<DeveloperResumeDoc>('DeveloperResume', DeveloperResumeSchema);
