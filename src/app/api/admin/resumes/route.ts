import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Resume from '@/server/models/Resume';
import { buildResume } from '@/server/resumeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const search = searchParams.get('search') ?? '';

  const filter: Record<string, unknown> = {};
  if (search) {
    const re = { $regex: search, $options: 'i' };
    filter.$or = [{ fullName: re }, { headline: re }, { email: re }, { skills: re }];
  }

  try {
    await connectDb();
    const [total, docs] = await Promise.all([
      Resume.countDocuments(filter),
      Resume.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: docs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[admin/resumes GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Every field is optional by design — sections auto-hide when empty.
  const data = buildResume(body, { partial: false });

  try {
    await connectDb();
    const doc = await Resume.create(data);
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    console.error('[admin/resumes POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
