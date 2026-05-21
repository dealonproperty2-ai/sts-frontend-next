import mongoose, { Schema, models, model } from 'mongoose';

const AuditLogSchema = new Schema(
  {
    adminId: { type: String, required: true, index: true },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },   // CREATE | UPDATE | DELETE | BULK_UPDATE | EXPORT | LOGIN | LOGOUT
    resource: { type: String, required: true },  // application | enquiry | user | course | bill | auth
    resourceId: { type: String, default: '' },
    details: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ resource: 1, createdAt: -1 });

export type AuditLogDoc = mongoose.InferSchemaType<typeof AuditLogSchema>;

export default (models.AuditLog as mongoose.Model<AuditLogDoc>) ||
  model<AuditLogDoc>('AuditLog', AuditLogSchema);
