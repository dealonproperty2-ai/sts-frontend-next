import mongoose, { Schema, models, model } from 'mongoose';

// Resume records authored from the admin panel (/admin/resumes) for students and
// staff. Dates are stored as free text (e.g. "Jan 2023", "Present") since resumes
// use flexible date formats. `template` selects the rendering style.

const ExperienceSchema = new Schema(
  {
    company:        { type: String, default: '' },
    role:           { type: String, default: '' },
    location:       { type: String, default: '' },
    startDate:      { type: String, default: '' },
    endDate:        { type: String, default: '' },
    current:        { type: Boolean, default: false },
    description:    { type: String, default: '' },
    // Premium-template fields (additive; older records simply have empty values)
    employmentType: { type: String, default: '' },
    technologies:   { type: [String], default: [] },
    responsibilities: { type: [String], default: [] },
    achievements:   { type: [String], default: [] },
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
    // `link` is the legacy field; `liveUrl` supersedes it and falls back to it.
    link:         { type: String, default: '' },
    technologies: { type: [String], default: [] },
    // Premium-template fields (additive)
    role:            { type: String, default: '' },
    duration:        { type: String, default: '' },
    liveUrl:         { type: String, default: '' },
    repoUrl:         { type: String, default: '' },
    responsibilities: { type: [String], default: [] },
    highlights:      { type: [String], default: [] },
  },
  { _id: false }
);

const ReferenceSchema = new Schema(
  {
    name:        { type: String, default: '' },
    designation: { type: String, default: '' },
    company:     { type: String, default: '' },
    contact:     { type: String, default: '' },
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
    // No field is mandatory — every section auto-hides when empty.
    fullName:       { type: String, default: '', trim: true },
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

    // ── Premium-template additions (all optional, backward compatible) ────────
    // 'employee'  → full personal contact details are rendered
    // 'client'    → resource profile; contact data is stripped before render
    resumeMode:       { type: String, enum: ['employee', 'client'], default: 'employee' },
    photoUrl:         { type: String, default: '' },
    yearsOfExperience:{ type: Number, default: 0, min: 0, max: 60 },
    availability:     { type: String, default: '' },
    englishLevel:     { type: String, default: '' },
    // Resource-profile extras — surfaced on client profiles, ignored otherwise.
    noticePeriod:     { type: String, default: '' },
    currentLocation:  { type: String, default: '' },
    preferredTimeZone:{ type: String, default: '' },
    primaryTechStack: { type: [String], default: [] },
    coreCompetencies: { type: [String], default: [] },
    achievements:     { type: [String], default: [] },
    interests:        { type: [String], default: [] },
    references:       { type: [ReferenceSchema], default: [] },

    template: {
      type: String,
      // Legacy HTML templates keep working unchanged; the last two are react-pdf.
      enum: ['classic', 'modern', 'minimal', 'corporate-sidebar', 'executive-professional'],
      default: 'classic',
    },
  },
  { timestamps: true }
);

export type ResumeDoc = mongoose.InferSchemaType<typeof ResumeSchema>;

export default (models.Resume as mongoose.Model<ResumeDoc>) ||
  model<ResumeDoc>('Resume', ResumeSchema);
