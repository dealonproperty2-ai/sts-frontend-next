import mongoose, { Schema, models, model } from 'mongoose';

// Resume records authored from the admin panel (/admin/resumes) for students and
// staff. Dates are stored as free text (e.g. "Jan 2023", "Present") since resumes
// use flexible date formats. `template` selects the rendering style.

const ExperienceSchema = new Schema(
  {
    company:     { type: String, default: '' },
    role:        { type: String, default: '' },
    location:    { type: String, default: '' },
    startDate:   { type: String, default: '' },
    endDate:     { type: String, default: '' },
    current:     { type: Boolean, default: false },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const EducationSchema = new Schema(
  {
    institution: { type: String, default: '' },
    degree:      { type: String, default: '' },
    field:       { type: String, default: '' },
    startDate:   { type: String, default: '' },
    endDate:     { type: String, default: '' },
    grade:       { type: String, default: '' },
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    name:         { type: String, default: '' },
    description:  { type: String, default: '' },
    link:         { type: String, default: '' },
    technologies: { type: [String], default: [] },
  },
  { _id: false }
);

const SkillCategorySchema = new Schema(
  {
    label: { type: String, default: '' },
    items: { type: [String], default: [] },
  },
  { _id: false }
);

const CertificationSchema = new Schema(
  {
    name:   { type: String, default: '' },
    issuer: { type: String, default: '' },
    date:   { type: String, default: '' },
  },
  { _id: false }
);

const ResumeSchema = new Schema(
  {
    fullName:       { type: String, required: true, trim: true },
    headline:       { type: String, default: '' },
    email:          { type: String, default: '' },
    phone:          { type: String, default: '' },
    location:       { type: String, default: '' },
    website:        { type: String, default: '' },
    linkedin:       { type: String, default: '' },
    github:         { type: String, default: '' },
    summary:        { type: String, default: '' },
    skills:         { type: [String], default: [] },
    skillCategories:{ type: [SkillCategorySchema], default: [] },
    experience:     { type: [ExperienceSchema], default: [] },
    education:      { type: [EducationSchema], default: [] },
    projects:       { type: [ProjectSchema], default: [] },
    certifications: { type: [CertificationSchema], default: [] },
    languages:      { type: [String], default: [] },
    template:       { type: String, enum: ['classic', 'modern', 'minimal'], default: 'classic' },
  },
  { timestamps: true }
);

export type ResumeDoc = mongoose.InferSchemaType<typeof ResumeSchema>;

export default (models.Resume as mongoose.Model<ResumeDoc>) ||
  model<ResumeDoc>('Resume', ResumeSchema);
