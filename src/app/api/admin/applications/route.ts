import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Application from '@/server/models/Application';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  const showDeleted = searchParams.get('deleted') === 'true';

  const filter: Record<string, unknown> = {};
  filter.deletedAt = showDeleted ? { $ne: null } : null;
  if (status) filter.status = status;
  if (search) {
    const re = { $regex: search, $options: 'i' };
    filter.$or = [{ name: re }, { email: re }, { role: re }, { phone: re }];
  }

  try {
    await connectDb();
    const [total, docs] = await Promise.all([
      Application.countDocuments(filter),
      Application.find(filter)
        .sort({ createdAt: -1 })
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
    console.error('[admin/applications GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
