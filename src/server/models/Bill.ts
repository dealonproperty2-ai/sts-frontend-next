import mongoose, { Schema, models, model } from 'mongoose';

const BillSchema = new Schema(
  {
    billType: { type: String, enum: ['rent', 'electricity'], required: true },
    billMonth: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    invoiceNumber: { type: String, required: true, trim: true },
    billDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidDate: { type: Date },
    notes: { type: String, trim: true, default: '' },
    fileUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    fileType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BillSchema.index({ billMonth: -1 });
BillSchema.index({ status: 1 });
BillSchema.index({ dueDate: 1 });

export type BillDoc = mongoose.InferSchemaType<typeof BillSchema> & {
  _id: mongoose.Types.ObjectId;
};

export default (models.Bill as mongoose.Model<BillDoc>) ||
  model<BillDoc>('Bill', BillSchema);
