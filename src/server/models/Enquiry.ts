import mongoose, { Schema, models, model } from 'mongoose';

const EnquirySchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, maxlength: 100 },
    phone: { type: String, default: null, maxlength: 30 },
    country: { type: String, default: null, maxlength: 60 },
    service: { type: String, default: null, maxlength: 100 },
    budget: { type: String, default: null, maxlength: 60 },
    message: { type: String, required: true },
    status: { type: String, default: 'new', enum: ['new', 'open', 'closed'] },
    sourceIp: { type: String, default: null },
    userAgent: { type: String, default: null },
    // Soft delete
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EnquirySchema.index({ status: 1, createdAt: -1 });
EnquirySchema.index({ deletedAt: 1 });

export type EnquiryDoc = mongoose.InferSchemaType<typeof EnquirySchema>;

export default (models.Enquiry as mongoose.Model<EnquiryDoc>) ||
  model<EnquiryDoc>('Enquiry', EnquirySchema);
