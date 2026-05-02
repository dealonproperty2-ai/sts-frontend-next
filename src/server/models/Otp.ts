import mongoose, { Schema, models, model } from 'mongoose';

const OtpSchema = new Schema(
  {
    target: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    purpose: { type: String, default: 'login' },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export type OtpDoc = mongoose.InferSchemaType<typeof OtpSchema>;

export default (models.Otp as mongoose.Model<OtpDoc>) ||
  model<OtpDoc>('Otp', OtpSchema);
