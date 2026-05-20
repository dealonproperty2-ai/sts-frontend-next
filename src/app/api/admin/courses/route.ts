import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Course from '@/server/models/Course';
import { clean, isNonEmptyString } from '@/server/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TAGS = ['Flagship', 'Cohort', 'Specialist'];

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
    filter.$or = [{ title: re }, { slug: re }, { tag: re }];
  }

  try {
    await connectDb();
    const [total, docs] = await Promise.all([
      Course.countDocuments(filter),
      Course.find(filter)
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
    console.error('[admin/courses GET]', err);
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

  const slug = clean(body.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const title = clean(body.title, 200);
  const tag = clean(body.tag, 30);
  const dur = clean(body.dur, 100);
  const stack = clean(body.stack, 300);
  const price = clean(body.price, 50);
  const desc = clean(body.desc, 500);
  const longDesc = clean(body.longDesc, 2000);
  const icon = clean(body.icon, 50) || 'code';
  const weeks = parseInt(String(body.weeks ?? ''), 10);
  const classes = parseInt(String(body.classes ?? ''), 10);
  const seats = parseInt(String(body.seats ?? ''), 10);
  const priceInr = parseInt(String(body.priceInr ?? ''), 10);
  const sortOrder = parseInt(String(body.sortOrder ?? '0'), 10) || 0;
  const isActive = body.isActive !== false;

  if (!isNonEmptyString(slug, 80)) return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  if (!isNonEmptyString(title, 200)) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!VALID_TAGS.includes(tag)) return NextResponse.json({ error: `tag must be one of: ${VALID_TAGS.join(', ')}` }, { status: 400 });
  if (!isNonEmptyString(dur, 100)) return NextResponse.json({ error: 'dur is required' }, { status: 400 });
  if (!isNonEmptyString(stack, 300)) return NextResponse.json({ error: 'stack is required' }, { status: 400 });
  if (!isNonEmptyString(price, 50)) return NextResponse.json({ error: 'price is required' }, { status: 400 });
  if (!isNonEmptyString(desc, 500)) return NextResponse.json({ error: 'desc is required' }, { status: 400 });
  if (!isNonEmptyString(longDesc, 2000)) return NextResponse.json({ error: 'longDesc is required' }, { status: 400 });
  if (!Number.isFinite(weeks) || weeks < 1) return NextResponse.json({ error: 'weeks must be a positive integer' }, { status: 400 });
  if (!Number.isFinite(classes) || classes < 1) return NextResponse.json({ error: 'classes must be a positive integer' }, { status: 400 });
  if (!Number.isFinite(seats) || seats < 1) return NextResponse.json({ error: 'seats must be a positive integer' }, { status: 400 });
  if (!Number.isFinite(priceInr) || priceInr < 0) return NextResponse.json({ error: 'priceInr must be a non-negative number' }, { status: 400 });

  try {
    await connectDb();
    const existing = await Course.findOne({ slug });
    if (existing) return NextResponse.json({ error: 'A course with this slug already exists' }, { status: 409 });

    const doc = await Course.create({ slug, icon, tag, title, dur, weeks, classes, stack, seats, price, priceInr, desc, longDesc, isActive, sortOrder });
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    console.error('[admin/courses POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
