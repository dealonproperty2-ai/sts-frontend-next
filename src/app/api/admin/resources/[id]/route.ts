import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import path from 'path';
import { unlink } from 'fs/promises';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Resource from '@/server/models/Resource';
import '@/server/models/Employee'; // register ref for populate
import { buildResource, uploadDir } from '@/server/resourceHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const badId = () => NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

async function removeStoredFile(fileUrl?: string) {
  if (!fileUrl) return;
  const filename = path.basename(fileUrl);
  if (!filename || filename.includes('..')) return;
  try { await unlink(path.join(uploadDir(), filename)); } catch { /* already gone */ }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();
  try {
    await connectDb();
    const doc = await Resource.findById(params.id)
      .populate('employee', 'name employeeId designation email phone workLocation')
      .lean();
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/resources/:id GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const built = buildResource(body, { partial: true });
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });
  const update = built.data;

  // Archive / restore is a lifecycle flag handled here rather than in buildResource.
  if (body.archived !== undefined) update.archivedAt = body.archived ? new Date() : null;

  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  try {
    await connectDb();
    const doc = await Resource.findByIdAndUpdate(params.id, { $set: update }, { new: true, lean: true });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/resources/:id PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();
  try {
    await connectDb();
    const doc = await Resource.findByIdAndDelete(params.id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await removeStoredFile(doc.resumeUrl);
    await removeStoredFile(doc.profilePhotoUrl);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/resources/:id DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
