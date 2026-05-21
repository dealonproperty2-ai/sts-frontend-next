import mongoose, { Schema, models, model } from 'mongoose';

const ApplicationSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    message: { type: String, default: '' },
    status: {
      type: String,
      default: 'new',
      enum: ['new', 'reviewed', 'shortlisted', 'rejected', 'hired'],
    },
    adminNotes: { type: String, default: '' },
    sourceIp: { type: String, default: null },
    userAgent: { type: String, default: null },
    // Soft delete
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ApplicationSchema.index({ status: 1, createdAt: -1 });
ApplicationSchema.index({ deletedAt: 1 });

export type ApplicationDoc = mongoose.InferSchemaType<typeof ApplicationSchema>;

export default (models.Application as mongoose.Model<ApplicationDoc>) ||
  model<ApplicationDoc>('Application', ApplicationSchema);
