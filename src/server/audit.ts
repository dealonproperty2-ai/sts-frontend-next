import { connectDb } from './db';
import AuditLog from './models/AuditLog';

interface AuditPayload {
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: unknown;
  ip?: string;
}

export function audit(payload: AuditPayload): void {
  // Fire-and-forget: never block the response for logging
  connectDb()
    .then(() => AuditLog.create(payload))
    .catch((err) => console.error('[audit]', err));
}
