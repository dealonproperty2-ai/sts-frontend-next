import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Bill from '@/server/models/Bill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const month = searchParams.get('month') ?? '';
  const year = searchParams.get('year') ?? '';
  const billType = searchParams.get('type') ?? '';
  const status = searchParams.get('status') ?? '';

  const filter: Record<string, unknown> = {};
  if (month) {
    filter.billMonth = month;
  } else if (year && /^\d{4}$/.test(year)) {
    filter.billMonth = { $regex: `^${year}-` };
  }
  if (billType && ['rent', 'electricity'].includes(billType)) filter.billType = billType;
  if (status && ['pending', 'paid'].includes(status)) filter.status = status;

  try {
    await connectDb();
    const [total, docs] = await Promise.all([
      Bill.countDocuments(filter),
      Bill.find(filter)
        .sort({ billMonth: -1, billDate: -1 })
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
    console.error('[admin/bills GET]', err);
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

  const {
    billType, billMonth, invoiceNumber, billDate, dueDate,
    amount, gstAmount, status, paidDate, notes,
    fileUrl, fileName, fileType, fileSize,
  } = body;

  if (!billType || !billMonth || !invoiceNumber || !billDate || !dueDate ||
      amount == null || gstAmount == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['rent', 'electricity'].includes(String(billType))) {
    return NextResponse.json({ error: 'Invalid bill type' }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}$/.test(String(billMonth))) {
    return NextResponse.json({ error: 'billMonth must be YYYY-MM' }, { status: 400 });
  }

  const amt = Number(amount);
  const gst = Number(gstAmount);
  if (isNaN(amt) || isNaN(gst) || amt < 0 || gst < 0) {
    return NextResponse.json({ error: 'Invalid amount values' }, { status: 400 });
  }

  try {
    await connectDb();
    const bill = await Bill.create({
      billType,
      billMonth,
      invoiceNumber: String(invoiceNumber).trim(),
      billDate: new Date(String(billDate)),
      dueDate: new Date(String(dueDate)),
      amount: amt,
      gstAmount: gst,
      totalAmount: amt + gst,
      status: ['pending', 'paid'].includes(String(status)) ? status : 'pending',
      paidDate: paidDate ? new Date(String(paidDate)) : undefined,
      notes: notes ? String(notes).trim() : '',
      fileUrl: fileUrl ? String(fileUrl) : '',
      fileName: fileName ? String(fileName) : '',
      fileType: fileType ? String(fileType) : '',
      fileSize: fileSize ? Number(fileSize) : 0,
    });

    return NextResponse.json({ success: true, data: bill }, { status: 201 });
  } catch (err) {
    console.error('[admin/bills POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
