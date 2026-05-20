import mongoose, { Schema, models, model } from 'mongoose';

const EnquirySchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, maxlength: 100 },
    phone: { type: String, default: null },
    country: { type: String, default: null },
    service: { type: String, default: null },
    budget: { type: String, default: null },
    message: { type: String, required: true },
    status: { type: String, default: 'new' },
    sourceIp: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

export type EnquiryDoc = mongoose.InferSchemaType<typeof EnquirySchema>;

export default (models.Enquiry as mongoose.Model<EnquiryDoc>) ||
  model<EnquiryDoc>('Enquiry', EnquirySchema);
