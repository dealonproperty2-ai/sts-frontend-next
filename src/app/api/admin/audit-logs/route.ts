import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import AuditLog from '@/server/models/AuditLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const resource = searchParams.get('resource') ?? '';
  const action = searchParams.get('action') ?? '';
  const adminId = searchParams.get('adminId') ?? '';

  const filter: Record<string, unknown> = {};
  if (resource) filter.resource = resource;
  if (action) filter.action = action;
  if (adminId) filter.adminId = adminId;

  try {
    await connectDb();
    const [total, docs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
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
    console.error('[admin/audit-logs GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
