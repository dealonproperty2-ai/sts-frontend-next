import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Enquiry from '@/server/models/Enquiry';
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
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const status = clean(body.status, 30);
  if (!status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    await connectDb();
    const doc = await Enquiry.findByIdAndUpdate(
      params.id,
      { $set: { status } },
      { new: true, lean: true }
    );
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

  try {
    await connectDb();
    const doc = await Enquiry.findByIdAndDelete(params.id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/enquiries/:id DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
