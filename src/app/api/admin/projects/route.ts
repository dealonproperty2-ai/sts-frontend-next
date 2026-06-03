import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Project from '@/server/models/Project';
import { clean, isNonEmptyString } from '@/server/validation';
import { parseTechnologies, cleanOptionalUrl } from '@/server/projectHelpers';

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
    filter.$or = [{ title: re }, { category: re }, { clientName: re }, { technologies: re }];
  }

  try {
    await connectDb();
    const [total, docs] = await Promise.all([
      Project.countDocuments(filter),
      Project.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
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
    console.error('[admin/projects GET]', err);
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

  const title = clean(body.title, 200);
  const description = clean(body.description, 5000);
  const category = clean(body.category, 100);
  const clientName = clean(body.clientName, 200);
  const technologies = parseTechnologies(body.technologies);
  const sortOrder = parseInt(String(body.sortOrder ?? '0'), 10) || 0;
  const isActive = body.isActive !== false;

  if (!isNonEmptyString(title, 200)) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!isNonEmptyString(description, 5000)) return NextResponse.json({ error: 'description is required' }, { status: 400 });
  if (!isNonEmptyString(category, 100)) return NextResponse.json({ error: 'category is required' }, { status: 400 });
  if (technologies.length === 0) return NextResponse.json({ error: 'at least one technology is required' }, { status: 400 });

  const projectUrl = cleanOptionalUrl(body.projectUrl);
  if (projectUrl === null) return NextResponse.json({ error: 'projectUrl must start with http:// or https://' }, { status: 400 });
  const repoUrl = cleanOptionalUrl(body.repoUrl);
  if (repoUrl === null) return NextResponse.json({ error: 'repoUrl must start with http:// or https://' }, { status: 400 });

  try {
    await connectDb();
    const doc = await Project.create({
      title, description, technologies, category, projectUrl, repoUrl, clientName, isActive, sortOrder,
    });
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    console.error('[admin/projects POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
