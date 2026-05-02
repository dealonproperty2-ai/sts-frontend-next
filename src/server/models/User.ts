import mongoose, { Schema, models, model } from 'mongoose';

const UserSchema = new Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type UserDoc = mongoose.InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export default (models.User as mongoose.Model<UserDoc>) ||
  model<UserDoc>('User', UserSchema);
