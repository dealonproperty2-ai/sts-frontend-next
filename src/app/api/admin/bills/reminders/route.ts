import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Bill from '@/server/models/Bill';
import { sendBillReminderMail } from '@/server/mailer';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST: send email reminders for pending bills due within 7 days
export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    await connectDb();
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const bills = await Bill.find({
      status: 'pending',
      dueDate: { $gte: now, $lte: sevenDaysFromNow },
    }).sort({ dueDate: 1 }).lean();

    if (!bills.length) {
      return NextResponse.json({ success: true, message: 'No pending bills due in the next 7 days', sent: 0 });
    }

    const payload = bills.map((b) => ({
      billType: b.billType,
      invoiceNumber: b.invoiceNumber,
      dueDate: b.dueDate as Date,
      totalAmount: b.totalAmount,
    }));

    const result = await sendBillReminderMail(payload);

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'EXPORT', resource: 'bill', details: { reminder: true, count: bills.length }, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });

    if (!result.sent) {
      return NextResponse.json({ success: false, message: 'SMTP not configured — reminder not sent', count: bills.length });
    }

    return NextResponse.json({ success: true, message: `Reminder sent for ${bills.length} bill${bills.length > 1 ? 's' : ''}`, sent: bills.length });
  } catch (err) {
    console.error('[admin/bills/reminders]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
