import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Course from '@/server/models/Course';
import { clean, isNonEmptyString } from '@/server/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TAGS = ['Flagship', 'Cohort', 'Specialist'];

function badId() {
  return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const doc = await Course.findById(params.id).lean();
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/courses/:id GET]', err);
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

  const update: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const v = clean(body.title, 200);
    if (!isNonEmptyString(v, 200)) return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 });
    update.title = v;
  }
  if (body.slug !== undefined) {
    update.slug = clean(body.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
  if (body.tag !== undefined) {
    const v = clean(body.tag, 30);
    if (!VALID_TAGS.includes(v)) return NextResponse.json({ error: `tag must be one of: ${VALID_TAGS.join(', ')}` }, { status: 400 });
    update.tag = v;
  }
  if (body.icon !== undefined) update.icon = clean(body.icon, 50) || 'code';
  if (body.dur !== undefined) update.dur = clean(body.dur, 100);
  if (body.stack !== undefined) update.stack = clean(body.stack, 300);
  if (body.price !== undefined) update.price = clean(body.price, 50);
  if (body.desc !== undefined) update.desc = clean(body.desc, 500);
  if (body.longDesc !== undefined) update.longDesc = clean(body.longDesc, 2000);
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);
  if (body.sortOrder !== undefined) update.sortOrder = parseInt(String(body.sortOrder), 10) || 0;

  for (const [key, field] of [['weeks', 'weeks'], ['classes', 'classes'], ['seats', 'seats']] as const) {
    if (body[key] !== undefined) {
      const n = parseInt(String(body[key]), 10);
      if (!Number.isFinite(n) || n < 1) return NextResponse.json({ error: `${field} must be a positive integer` }, { status: 400 });
      update[key] = n;
    }
  }
  if (body.priceInr !== undefined) {
    const n = parseInt(String(body.priceInr), 10);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: 'priceInr must be non-negative' }, { status: 400 });
    update.priceInr = n;
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    await connectDb();
    const doc = await Course.findByIdAndUpdate(params.id, { $set: update }, { new: true, lean: true });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/courses/:id PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const doc = await Course.findByIdAndDelete(params.id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/courses/:id DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
