import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import User from '@/server/models/User';
import { clean, isNonEmptyString } from '@/server/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ROLES = ['user', 'admin'];

function badId() {
  return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
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

  if (body.name !== undefined) update.name = clean(body.name, 100);
  if (body.phone !== undefined) update.phone = clean(body.phone, 30);

  if (body.role !== undefined) {
    const role = clean(body.role, 20);
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }
    update.role = role;
  }

  if (body.isActive !== undefined) {
    update.isActive = Boolean(body.isActive);
  }

  if (body.password !== undefined) {
    const pw = clean(body.password, 200);
    if (!isNonEmptyString(pw, 200) || pw.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    update.password = await bcrypt.hash(pw, 12);
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    await connectDb();
    const doc = await User.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, lean: true }
    ).select('-password');
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/users/:id PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  if (auth.payload.id === params.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  try {
    await connectDb();
    const doc = await User.findByIdAndDelete(params.id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/users/:id DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
