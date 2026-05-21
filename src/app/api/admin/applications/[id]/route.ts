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

function badId() {
  return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const doc = await Application.findById(params.id).lean();
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/applications/:id GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const update: Record<string, unknown> = {};
  const status = clean(body.status, 30);
  const adminNotes = clean(body.adminNotes, 2000);

  if (body.restore === true) {
    update.deletedAt = null;
  }

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    update.status = status;
  }
  if (body.adminNotes !== undefined) update.adminNotes = adminNotes;

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    await connectDb();
    const doc = await Application.findByIdAndUpdate(params.id, { $set: update }, { new: true, lean: true });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'UPDATE', resource: 'application', resourceId: params.id, details: Object.keys(update), ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/applications/:id PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  const { searchParams } = new URL(req.url);
  const permanent = searchParams.get('permanent') === 'true';

  try {
    await connectDb();
    if (permanent) {
      const doc = await Application.findByIdAndDelete(params.id);
      if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } else {
      const doc = await Application.findByIdAndUpdate(params.id, { $set: { deletedAt: new Date() } }, { new: true });
      if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: permanent ? 'DELETE' : 'SOFT_DELETE', resource: 'application', resourceId: params.id, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/applications/:id DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
