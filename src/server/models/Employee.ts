import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  employeeId: string;
  name: string;
  fatherName: string;
  email: string;
  phone: string;
  address: string;
  designation: string;
  department: string;
  joiningDate?: Date;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  panNumber: string;
  uanNumber: string;
  pfNumber: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  branchCode: string;
  workLocation: string;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeId:      { type: String, unique: true, sparse: true },
    name:            { type: String, required: true, trim: true },
    fatherName:      { type: String, default: '', trim: true },
    email:           { type: String, default: '', lowercase: true, trim: true },
    phone:           { type: String, default: '', trim: true },
    address:         { type: String, default: '' },
    designation:     { type: String, required: true, trim: true },
    department:      { type: String, default: '', trim: true },
    joiningDate:     { type: Date },
    basicSalary:     { type: Number, default: 0, min: 0 },
    hra:             { type: Number, default: 0, min: 0 },
    specialAllowance:{ type: Number, default: 0, min: 0 },
    panNumber:       { type: String, default: '', uppercase: true, trim: true },
    uanNumber:       { type: String, default: '', trim: true },
    pfNumber:        { type: String, default: '', trim: true },
    bankName:        { type: String, default: '', trim: true },
    accountNumber:   { type: String, default: '', trim: true },
    ifscCode:        { type: String, default: '', uppercase: true, trim: true },
    branchName:      { type: String, default: '', trim: true },
    branchCode:      { type: String, default: '', trim: true },
    workLocation:    { type: String, default: '', trim: true },
    isActive:        { type: Boolean, default: true },
    deletedAt:       { type: Date, default: null },
  },
  { timestamps: true }
);

EmployeeSchema.index({ deletedAt: 1 });
EmployeeSchema.index({ name: 'text', email: 'text', designation: 'text', department: 'text' });

// Auto-generate employeeId before saving when the admin leaves it blank.
// Sequence is derived from the highest existing STS-number (custom/manual ids are
// ignored so they never skew it), then probed forward to skip any collision.
EmployeeSchema.pre('save', async function (next) {
  if (this.employeeId) return next();
  try {
    const Model = this.constructor as mongoose.Model<IEmployee>;
    // Zero-padded STS ids sort lexicographically the same as numerically.
    const last = await Model.findOne({ employeeId: /^STS\d+$/ })
      .sort({ employeeId: -1 })
      .lean();
    let seq = 1;
    if (last?.employeeId) {
      const num = parseInt(last.employeeId.slice(3), 10);
      if (!isNaN(num)) seq = num + 1;
    }
    let candidate = 'STS' + String(seq).padStart(7, '0');
    // Guard against gaps / races where the next number already exists.
    while (await Model.exists({ employeeId: candidate })) {
      seq += 1;
      candidate = 'STS' + String(seq).padStart(7, '0');
    }
    this.employeeId = candidate;
  } catch {
    // non-fatal — admin can set it manually
  }
  next();
});

export default mongoose.models.Employee ||
  mongoose.model<IEmployee>('Employee', EmployeeSchema);
