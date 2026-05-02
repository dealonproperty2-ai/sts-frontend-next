import mongoose, { Schema, models, model } from 'mongoose';

const ApplicationSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    message: { type: String, default: '' },
    status: { type: String, default: 'new' },
    sourceIp: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

export type ApplicationDoc = mongoose.InferSchemaType<typeof ApplicationSchema>;

export default (models.Application as mongoose.Model<ApplicationDoc>) ||
  model<ApplicationDoc>('Application', ApplicationSchema);
