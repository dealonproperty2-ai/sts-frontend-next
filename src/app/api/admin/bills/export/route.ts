import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Bill from '@/server/models/Bill';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvEscape(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') ?? '';
  const year = searchParams.get('year') ?? '';
  const type = searchParams.get('type') ?? '';
  const status = searchParams.get('status') ?? '';

  const filter: Record<string, unknown> = {};
  if (month) filter.billMonth = month;
  else if (year) filter.billMonth = { $regex: `^${year}-` };
  if (type) filter.billType = type;
  if (status) filter.status = status;

  try {
    await connectDb();
    const docs = await Bill.find(filter).sort({ billMonth: -1, billDate: -1 }).limit(5000).lean();

    const headers = ['Bill Type', 'Bill Month', 'Invoice #', 'Bill Date', 'Due Date', 'Amount', 'GST', 'Total', 'Status', 'Paid Date', 'Notes'];
    const rows = docs.map((d) => [
      csvEscape(d.billType), csvEscape(d.billMonth), csvEscape(d.invoiceNumber),
      csvEscape(d.billDate ? new Date(d.billDate as Date).toLocaleDateString('en-IN') : ''),
      csvEscape(d.dueDate ? new Date(d.dueDate as Date).toLocaleDateString('en-IN') : ''),
      csvEscape(d.amount), csvEscape(d.gstAmount), csvEscape(d.totalAmount),
      csvEscape(d.status),
      csvEscape(d.paidDate ? new Date(d.paidDate as Date).toLocaleDateString('en-IN') : ''),
      csvEscape(d.notes),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    const filename = `bills-${new Date().toISOString().slice(0, 10)}.csv`;

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'EXPORT', resource: 'bill', details: { count: docs.length }, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[admin/bills/export]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
