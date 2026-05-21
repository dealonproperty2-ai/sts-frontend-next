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
    const numFields = ['workingDays','basicSalary','hra','specialAllowance','bonus','pfDeduction','professionalTax','otherDeductions'];
    for (const f of numFields) {
      if (body[f] !== undefined) updates[f] = Number(body[f]) || 0;
    }
    if (body.month)  updates.month  = body.month;
    if (body.status) updates.status = body.status;

    // Recalculate derived fields if earnings/deductions changed
    if (Object.keys(updates).some(k => numFields.includes(k))) {
      const gross = (updates.basicSalary ?? body.basicSalary ?? 0) as number
        + (updates.hra ?? body.hra ?? 0) as number
        + (updates.specialAllowance ?? body.specialAllowance ?? 0) as number
        + (updates.bonus ?? body.bonus ?? 0) as number;
      const totalDed = (updates.pfDeduction ?? body.pfDeduction ?? 0) as number
        + (updates.professionalTax ?? body.professionalTax ?? 0) as number
        + (updates.otherDeductions ?? body.otherDeductions ?? 0) as number;
      updates.grossSalary    = gross;
      updates.totalDeductions = totalDed;
      updates.netSalary      = gross - totalDed;
    }

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
