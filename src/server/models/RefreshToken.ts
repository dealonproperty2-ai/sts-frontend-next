import mongoose, { Schema, models, model } from 'mongoose';

const RefreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

export type RefreshTokenDoc = mongoose.InferSchemaType<typeof RefreshTokenSchema>;

export default (models.RefreshToken as mongoose.Model<RefreshTokenDoc>) ||
  model<RefreshTokenDoc>('RefreshToken', RefreshTokenSchema);
