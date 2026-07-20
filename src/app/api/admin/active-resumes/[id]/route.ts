import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import path from 'path';
import { unlink } from 'fs/promises';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import DeveloperResume from '@/server/models/DeveloperResume';
import { isNonEmptyString } from '@/server/validation';
import { buildDeveloperResume, uploadDir } from '@/server/developerResumeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function badId() {
  return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
}

// Best-effort removal of a stored file referenced by one of our file URLs.
async function removeStoredFile(fileUrl?: string) {
  if (!fileUrl) return;
  const filename = path.basename(fileUrl);
  if (!filename || filename.includes('..')) return;
  try {
    await unlink(path.join(uploadDir(), filename));
  } catch {
    // already gone / never written — non-fatal
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const doc = await DeveloperResume.findById(params.id).lean();
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/active-resumes/:id GET]', err);
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

  const built = buildDeveloperResume(body, { partial: true });
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });

  const update = built.data;
  if ('name' in update && !isNonEmptyString(update.name as string, 200)) {
    return NextResponse.json({ error: 'Developer name cannot be empty' }, { status: 400 });
  }
  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    await connectDb();
    const doc = await DeveloperResume.findByIdAndUpdate(params.id, { $set: update }, { new: true, lean: true });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/active-resumes/:id PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const doc = await DeveloperResume.findByIdAndDelete(params.id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Clean up the uploaded files so deleted records don't leave orphans behind.
    await removeStoredFile(doc.resumeUrl);
    await removeStoredFile(doc.profileImageUrl);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/active-resumes/:id DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
