import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import DeveloperResume from '@/server/models/DeveloperResume';
import { isNonEmptyString } from '@/server/validation';
import { buildDeveloperResume, isDeveloperType, isStatus } from '@/server/developerResumeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Whitelisted sort keys -> mongo sort spec (never trust raw input in .sort()).
const SORTS: Record<string, Record<string, 1 | -1>> = {
  updated:    { updatedAt: -1 },
  created:    { createdAt: -1 },
  name:       { name: 1 },
  experience: { experienceYears: -1 },
  type:       { developerType: 1, name: 1 },
};

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const developerType = searchParams.get('developerType') ?? '';
  const sort = SORTS[searchParams.get('sort') ?? 'updated'] ?? SORTS.updated;

  const filter: Record<string, unknown> = {};
  if (status && isStatus(status)) filter.status = status;
  if (developerType && isDeveloperType(developerType)) filter.developerType = developerType;
  if (search) {
    const re = { $regex: search, $options: 'i' };
    filter.$or = [{ name: re }, { primarySkill: re }, { skills: re }, { developerType: re }, { notes: re }];
  }

  try {
    await connectDb();
    const [total, docs] = await Promise.all([
      DeveloperResume.countDocuments(filter),
      DeveloperResume.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: docs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[admin/active-resumes GET]', err);
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

  const built = buildDeveloperResume(body, { partial: false });
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });

  if (!isNonEmptyString(built.data.name as string, 200)) {
    return NextResponse.json({ error: 'Developer name is required' }, { status: 400 });
  }

  try {
    await connectDb();
    const doc = await DeveloperResume.create(built.data);
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    console.error('[admin/active-resumes POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
