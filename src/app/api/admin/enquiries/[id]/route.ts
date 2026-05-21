import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Enquiry from '@/server/models/Enquiry';
import { audit } from '@/server/audit';
import { clean } from '@/server/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['new', 'open', 'closed'];

function badId() {
  return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const doc = await Enquiry.findById(params.id).lean();
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/enquiries/:id GET]', err);
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

  if (body.restore === true) {
    update.deletedAt = null;
  }

  const status = clean(body.status, 30);
  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    update.status = status;
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    await connectDb();
    const doc = await Enquiry.findByIdAndUpdate(params.id, { $set: update }, { new: true, lean: true });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'UPDATE', resource: 'enquiry', resourceId: params.id, details: Object.keys(update), ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/enquiries/:id PATCH]', err);
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
      const doc = await Enquiry.findByIdAndDelete(params.id);
      if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } else {
      const doc = await Enquiry.findByIdAndUpdate(params.id, { $set: { deletedAt: new Date() } }, { new: true });
      if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: permanent ? 'DELETE' : 'SOFT_DELETE', resource: 'enquiry', resourceId: params.id, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/enquiries/:id DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
