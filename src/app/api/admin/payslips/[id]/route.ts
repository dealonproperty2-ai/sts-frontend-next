import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import PaySlip from '@/server/models/PaySlip';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  await connectDb();
  const slip = await PaySlip.findById(params.id).populate('employeeId').lean();
  if (!slip) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: slip });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    await connectDb();

    const updates: Record<string, unknown> = {};
    if (body.status) updates.status = body.status;

    const slip = await PaySlip.findByIdAndUpdate(params.id, { $set: updates }, { new: true }).lean();
    if (!slip) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'UPDATE', resource: 'payslip', resourceId: params.id, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ data: slip });
  } catch (err) {
    console.error('[payslips PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  await connectDb();
  const slip = await PaySlip.findByIdAndDelete(params.id).lean();
  if (!slip) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'DELETE', resource: 'payslip', resourceId: params.id, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
  return NextResponse.json({ success: true });
}
