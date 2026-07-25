import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Resource from '@/server/models/Resource';
import { AVAILABILITY_STATUSES } from '@/server/models/Resource';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dashboard aggregates for the stat cards and charts.
export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    await connectDb();
    const active = { archivedAt: null };

    const [total, internal, external, archived, byStatusAgg, topSkillsAgg] = await Promise.all([
      Resource.countDocuments(active),
      Resource.countDocuments({ ...active, resourceType: 'internal' }),
      Resource.countDocuments({ ...active, resourceType: 'external' }),
      Resource.countDocuments({ archivedAt: { $ne: null } }),
      Resource.aggregate([{ $match: active }, { $group: { _id: '$availabilityStatus', count: { $sum: 1 } } }]),
      Resource.aggregate([
        { $match: active },
        { $unwind: '$skills' },
        { $group: { _id: '$skills', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const byStatus: Record<string, number> = {};
    for (const s of AVAILABILITY_STATUSES) byStatus[s] = 0;
    for (const row of byStatusAgg) if (row._id in byStatus) byStatus[row._id] = row.count;

    return NextResponse.json({
      success: true,
      data: {
        total,
        internal,
        external,
        archived,
        available: byStatus.available,
        onProject: byStatus.on_project,
        reserved: byStatus.reserved,
        byStatus,
        topSkills: topSkillsAgg.map((s) => ({ skill: s._id, count: s.count })),
      },
    });
  } catch (err) {
    console.error('[admin/resources/stats GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
