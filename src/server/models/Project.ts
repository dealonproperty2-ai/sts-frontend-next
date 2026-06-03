import mongoose, { Schema, models, model } from 'mongoose';

// Portfolio of projects developed by Step To Soft Pvt. Ltd. — managed from the
// admin panel (/admin/projects). technologies is stored as an array of skill
// strings; the optional link/client fields default to ''.
const ProjectSchema = new Schema(
  {
    title:        { type: String, required: true, trim: true },
    description:  { type: String, required: true },
    technologies: { type: [String], default: [] },
    category:     { type: String, required: true, trim: true },
    projectUrl:   { type: String, default: '', trim: true },
    repoUrl:      { type: String, default: '', trim: true },
    clientName:   { type: String, default: '', trim: true },
    isActive:     { type: Boolean, default: true },
    sortOrder:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type ProjectDoc = mongoose.InferSchemaType<typeof ProjectSchema>;

export default (models.Project as mongoose.Model<ProjectDoc>) ||
  model<ProjectDoc>('Project', ProjectSchema);
