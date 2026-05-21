import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Application from '@/server/models/Application';
import Enquiry from '@/server/models/Enquiry';
import User from '@/server/models/User';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-process cache to avoid hammering DB on every dashboard load
let _cache: { data: unknown; at: number } | null = null;
const CACHE_TTL = 60_000; // 60 seconds

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const noCache = new URL(req.url).searchParams.get('refresh') === 'true';

  if (!noCache && _cache && Date.now() - _cache.at < CACHE_TTL) {
    return NextResponse.json({ success: true, data: _cache.data, cached: true });
  }

  try {
    await connectDb();

    const [appTotal, appByStatus, enqTotal, enqByStatus, userTotal] = await Promise.all([
      Application.countDocuments({ deletedAt: null }),
      Application.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Enquiry.countDocuments({ deletedAt: null }),
      Enquiry.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.countDocuments(),
    ]);

    const toMap = (arr: { _id: string; count: number }[]) =>
      Object.fromEntries(arr.map((x) => [x._id, x.count]));

    const data = {
      applications: { total: appTotal, ...toMap(appByStatus) },
      enquiries: { total: enqTotal, ...toMap(enqByStatus) },
      users: { total: userTotal },
    };

    _cache = { data, at: Date.now() };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[admin/stats]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
