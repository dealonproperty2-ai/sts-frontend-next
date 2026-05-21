import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Application from '@/server/models/Application';
import { audit } from '@/server/audit';
import { clean } from '@/server/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['new', 'reviewed', 'shortlisted', 'rejected', 'hired'];

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => mongoose.Types.ObjectId.isValid(String(id))) : [];
  if (!ids.length) return NextResponse.json({ error: 'ids must be a non-empty array of valid ObjectIds' }, { status: 400 });
  if (ids.length > 100) return NextResponse.json({ error: 'Maximum 100 ids per bulk operation' }, { status: 400 });

  const action = clean(body.action, 30);

  if (action === 'update_status') {
    const status = clean(body.status, 30);
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    await connectDb();
    const result = await Application.updateMany({ _id: { $in: ids } }, { $set: { status } });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'BULK_UPDATE', resource: 'application', details: { ids: ids.length, status }, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ success: true, modified: result.modifiedCount });
  }

  if (action === 'delete') {
    await connectDb();
    const result = await Application.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: new Date() } });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'BULK_UPDATE', resource: 'application', details: { ids: ids.length, soft_delete: true }, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ success: true, modified: result.modifiedCount });
  }

  if (action === 'restore') {
    await connectDb();
    const result = await Application.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: null } });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'BULK_UPDATE', resource: 'application', details: { ids: ids.length, restore: true }, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ success: true, modified: result.modifiedCount });
  }

  return NextResponse.json({ error: 'action must be update_status | delete | restore' }, { status: 400 });
}
