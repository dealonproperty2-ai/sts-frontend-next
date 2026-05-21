import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPaySlip extends Document {
  employeeId: Types.ObjectId;
  month: string;          // YYYY-MM
  workingDays: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  grossSalary: number;
  pfDeduction: number;
  professionalTax: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: 'generated' | 'sent' | 'downloaded';
  createdAt: Date;
  updatedAt: Date;
}

const PaySlipSchema = new Schema<IPaySlip>(
  {
    employeeId:      { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    month:           { type: String, required: true },  // e.g. "2026-03"
    workingDays:     { type: Number, default: 26, min: 0, max: 31 },
    basicSalary:     { type: Number, required: true, min: 0 },
    hra:             { type: Number, default: 0, min: 0 },
    specialAllowance:{ type: Number, default: 0, min: 0 },
    bonus:           { type: Number, default: 0, min: 0 },
    grossSalary:     { type: Number, required: true, min: 0 },
    pfDeduction:     { type: Number, default: 0, min: 0 },
    professionalTax: { type: Number, default: 0, min: 0 },
    otherDeductions: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    netSalary:       { type: Number, required: true, min: 0 },
    status:          { type: String, enum: ['generated', 'sent', 'downloaded'], default: 'generated' },
  },
  { timestamps: true }
);

PaySlipSchema.index({ employeeId: 1, month: 1 }, { unique: true });

export default mongoose.models.PaySlip ||
  mongoose.model<IPaySlip>('PaySlip', PaySlipSchema);
