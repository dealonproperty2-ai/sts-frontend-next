import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Bill from '@/server/models/Bill';
import { audit } from '@/server/audit';
import { unlink } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'bills');

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    await connectDb();
    const bill = await Bill.findById(params.id).lean();
    if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: bill });
  } catch (err) {
    console.error('[admin/bills/:id GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    await connectDb();
    const existing = await Bill.findById(params.id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowed = [
      'billType', 'billMonth', 'invoiceNumber', 'billDate', 'dueDate',
      'amount', 'gstAmount', 'status', 'paidDate', 'notes',
      'fileUrl', 'fileName', 'fileType', 'fileSize',
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (update.billDate) update.billDate = new Date(String(update.billDate));
    if (update.dueDate) update.dueDate = new Date(String(update.dueDate));
    if (update.paidDate) update.paidDate = new Date(String(update.paidDate));

    const newAmount = 'amount' in update ? Number(update.amount) : existing.amount;
    const newGst = 'gstAmount' in update ? Number(update.gstAmount) : existing.gstAmount;
    if (isNaN(newAmount) || isNaN(newGst) || newAmount < 0 || newGst < 0) {
      return NextResponse.json({ error: 'amount and gstAmount must be non-negative numbers' }, { status: 400 });
    }
    update.totalAmount = newAmount + newGst;

    const bill = await Bill.findByIdAndUpdate(params.id, { $set: update }, { new: true, runValidators: true });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'UPDATE', resource: 'bill', resourceId: params.id, details: Object.keys(update), ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ success: true, data: bill });
  } catch (err) {
    console.error('[admin/bills/:id PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    await connectDb();
    const bill = await Bill.findById(params.id);
    if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const fileUrl = bill.fileUrl;

    // Delete DB record first; file cleanup is best-effort
    await bill.deleteOne();

    if (fileUrl) {
      try {
        const filename = path.basename(fileUrl.split('/').pop() ?? '');
        if (filename && !/[/\\]/.test(filename)) {
          await unlink(path.join(UPLOADS_DIR, filename));
        }
      } catch { /* file already gone — no action needed */ }
    }

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'DELETE', resource: 'bill', resourceId: params.id, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/bills/:id DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
