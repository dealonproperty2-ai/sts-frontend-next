import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAppointmentLetter extends Document {
  employeeId: Types.ObjectId;
  offerDate: Date;
  joiningDate: Date;
  designation: string;
  department: string;
  salary: number;
  workLocation: string;
  probationPeriod: string;
  hrName: string;
  customTerms: string;
  status: 'generated' | 'sent' | 'downloaded';
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentLetterSchema = new Schema<IAppointmentLetter>(
  {
    employeeId:      { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    offerDate:       { type: Date, required: true },
    joiningDate:     { type: Date, required: true },
    designation:     { type: String, required: true, trim: true },
    department:      { type: String, default: '', trim: true },
    salary:          { type: Number, required: true, min: 0 },
    workLocation:    { type: String, default: '', trim: true },
    probationPeriod: { type: String, default: '3 (Three) months', trim: true },
    hrName:          { type: String, default: 'Naheed Zakia', trim: true },
    customTerms:     { type: String, default: '' },
    status:          { type: String, enum: ['generated', 'sent', 'downloaded'], default: 'generated' },
  },
  { timestamps: true }
);

export default mongoose.models.AppointmentLetter ||
  mongoose.model<IAppointmentLetter>('AppointmentLetter', AppointmentLetterSchema);
