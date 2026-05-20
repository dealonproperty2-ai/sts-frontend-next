import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Application from '@/server/models/Application';
import Enquiry from '@/server/models/Enquiry';
import User from '@/server/models/User';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    await connectDb();

    const [appTotal, appByStatus, enqTotal, enqByStatus, userTotal] = await Promise.all([
      Application.countDocuments(),
      Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Enquiry.countDocuments(),
      Enquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.countDocuments(),
    ]);

    const toMap = (arr: { _id: string; count: number }[]) =>
      Object.fromEntries(arr.map((x) => [x._id, x.count]));

    return NextResponse.json({
      success: true,
      data: {
        applications: { total: appTotal, ...toMap(appByStatus) },
        enquiries: { total: enqTotal, ...toMap(enqByStatus) },
        users: { total: userTotal },
      },
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
