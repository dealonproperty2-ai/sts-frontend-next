import mongoose, { Schema, models, model } from 'mongoose';

const CourseSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    icon: { type: String, required: true, default: 'code' },
    tag: { type: String, required: true, enum: ['Flagship', 'Cohort', 'Specialist'], default: 'Cohort' },
    title: { type: String, required: true },
    dur: { type: String, required: true },
    weeks: { type: Number, required: true, min: 1 },
    classes: { type: Number, required: true, min: 1 },
    stack: { type: String, required: true },
    seats: { type: Number, required: true, min: 1 },
    price: { type: String, required: true },
    priceInr: { type: Number, required: true, min: 0 },
    desc: { type: String, required: true },
    longDesc: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type CourseDoc = mongoose.InferSchemaType<typeof CourseSchema>;

export default (models.Course as mongoose.Model<CourseDoc>) ||
  model<CourseDoc>('Course', CourseSchema);
