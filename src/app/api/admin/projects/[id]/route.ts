import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Project from '@/server/models/Project';
import { clean, isNonEmptyString } from '@/server/validation';
import { parseTechnologies, cleanOptionalUrl } from '@/server/projectHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function badId() {
  return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const doc = await Project.findById(params.id).lean();
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/projects/:id GET]', err);
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
  if (body.description !== undefined) {
    const v = clean(body.description, 5000);
    if (!isNonEmptyString(v, 5000)) return NextResponse.json({ error: 'description cannot be empty' }, { status: 400 });
    update.description = v;
  }
  if (body.category !== undefined) {
    const v = clean(body.category, 100);
    if (!isNonEmptyString(v, 100)) return NextResponse.json({ error: 'category cannot be empty' }, { status: 400 });
    update.category = v;
  }
  if (body.technologies !== undefined) {
    const v = parseTechnologies(body.technologies);
    if (v.length === 0) return NextResponse.json({ error: 'at least one technology is required' }, { status: 400 });
    update.technologies = v;
  }
  if (body.projectUrl !== undefined) {
    const v = cleanOptionalUrl(body.projectUrl);
    if (v === null) return NextResponse.json({ error: 'projectUrl must start with http:// or https://' }, { status: 400 });
    update.projectUrl = v;
  }
  if (body.repoUrl !== undefined) {
    const v = cleanOptionalUrl(body.repoUrl);
    if (v === null) return NextResponse.json({ error: 'repoUrl must start with http:// or https://' }, { status: 400 });
    update.repoUrl = v;
  }
  if (body.clientName !== undefined) update.clientName = clean(body.clientName, 200);
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);
  if (body.sortOrder !== undefined) update.sortOrder = parseInt(String(body.sortOrder), 10) || 0;

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    await connectDb();
    const doc = await Project.findByIdAndUpdate(params.id, { $set: update }, { new: true, lean: true });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[admin/projects/:id PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const doc = await Project.findByIdAndDelete(params.id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/projects/:id DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
