import mongoose, { Schema, models, model } from 'mongoose';

// Active Resource Management — a bench of internal (employee-linked) and external
// (freelance/outsourced) developers the admin matches against client needs.
// Internal resources reference an Employee; key fields are denormalised onto the
// resource so listing/search/match never needs a join.

export const RESOURCE_TYPES = ['internal', 'external'] as const;

export const AVAILABILITY_STATUSES = [
  'available',
  'on_project',
  'reserved',
  'interview_scheduled',
  'joining_soon',
  'on_leave',
  'inactive',
] as const;

const CertificationSchema = new Schema(
  { name: { type: String, default: '' }, issuer: { type: String, default: '' }, date: { type: String, default: '' } },
  { _id: false }
);

const ExperienceSchema = new Schema(
  {
    company:          { type: String, default: '' },
    role:             { type: String, default: '' },
    location:         { type: String, default: '' },
    startDate:        { type: String, default: '' },
    endDate:          { type: String, default: '' },
    current:          { type: Boolean, default: false },
    description:      { type: String, default: '' },
    responsibilities: { type: [String], default: [] },
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    name:         { type: String, default: '' },
    description:  { type: String, default: '' },
    role:         { type: String, default: '' },
    duration:     { type: String, default: '' },
    link:         { type: String, default: '' },
    technologies: { type: [String], default: [] },
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

const ResourceSchema = new Schema(
  {
    resourceType: { type: String, enum: RESOURCE_TYPES, default: 'internal', index: true },
    // Set for internal resources; the profile fields below are still stored on the
    // resource (denormalised) so the module works standalone.
    employee:     { type: Schema.Types.ObjectId, ref: 'Employee', default: null },

    // ── Basic information ────────────────────────────────────────────────────
    fullName:            { type: String, default: '', trim: true },
    employeeCode:        { type: String, default: '', trim: true },
    profilePhotoUrl:     { type: String, default: '' },
    designation:         { type: String, default: '', trim: true },
    experienceYears:     { type: Number, default: 0, min: 0, max: 60 },
    skills:              { type: [String], default: [] },
    primaryTechnology:   { type: String, default: '', trim: true },
    secondaryTechnology: { type: String, default: '', trim: true },
    currentCompany:      { type: String, default: '', trim: true },
    location:            { type: String, default: '', trim: true },
    timeZone:            { type: String, default: '', trim: true },
    availabilityStatus:  { type: String, enum: AVAILABILITY_STATUSES, default: 'available', index: true },

    // ── Professional details ─────────────────────────────────────────────────
    resumeUrl:           { type: String, default: '' },
    resumeName:          { type: String, default: '' },
    resumeType:          { type: String, default: '' },
    resumeSize:          { type: Number, default: 0 },
    portfolioUrl:        { type: String, default: '' },
    linkedinUrl:         { type: String, default: '' },
    githubUrl:           { type: String, default: '' },
    certifications:      { type: [CertificationSchema], default: [] },
    englishLevel:        { type: String, default: '' },
    noticePeriod:        { type: String, default: '' },
    expectedJoiningDate: { type: String, default: '' },

    // ── Detail-page content ──────────────────────────────────────────────────
    summary:        { type: String, default: '' },
    workExperience: { type: [ExperienceSchema], default: [] },
    projects:       { type: [ProjectSchema], default: [] },
    education:      { type: [EducationSchema], default: [] },

    // ── Management ───────────────────────────────────────────────────────────
    archivedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// Text search across the fields the requirement matcher scans.
ResourceSchema.index({ fullName: 'text', skills: 'text', primaryTechnology: 'text', designation: 'text' });
ResourceSchema.index({ resourceType: 1, availabilityStatus: 1, archivedAt: 1 });

export type ResourceDoc = mongoose.InferSchemaType<typeof ResourceSchema>;

export default (models.Resource as mongoose.Model<ResourceDoc>) ||
  model<ResourceDoc>('Resource', ResourceSchema);
