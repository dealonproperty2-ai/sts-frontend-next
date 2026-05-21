import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Bill from '@/server/models/Bill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    await connectDb();

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [thisMonthBills, pendingBills, paidBills, upcomingDue] = await Promise.all([
      Bill.find({ billMonth: currentMonth }).lean(),
      Bill.find({ status: 'pending' }).lean(),
      Bill.find({ status: 'paid' }).lean(),
      Bill.find({
        status: 'pending',
        dueDate: { $gte: now, $lte: sevenDaysLater },
      })
        .sort({ dueDate: 1 })
        .lean(),
    ]);

    const sum = (bills: typeof thisMonthBills) =>
      bills.reduce((s, b) => s + (b.totalAmount ?? 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        currentMonth,
        totalThisMonth: sum(thisMonthBills),
        thisMonthCount: thisMonthBills.length,
        pendingCount: pendingBills.length,
        paidCount: paidBills.length,
        pendingAmount: sum(pendingBills),
        paidAmount: sum(paidBills),
        upcomingDueCount: upcomingDue.length,
        upcomingDue: upcomingDue.map(b => ({
          _id: b._id,
          billType: b.billType,
          invoiceNumber: b.invoiceNumber,
          dueDate: b.dueDate,
          totalAmount: b.totalAmount,
        })),
      },
    });
  } catch (err) {
    console.error('[admin/bills/stats GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
