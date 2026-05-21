import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Employee from '@/server/models/Employee';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  await connectDb();
  const emp = await Employee.findById(params.id).lean();
  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: emp });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    await connectDb();

    const updates: Record<string, unknown> = {};
    const fields = ['name','fatherName','email','phone','address','designation','department',
      'joiningDate','basicSalary','hra','specialAllowance','panNumber','uanNumber','pfNumber',
      'bankName','accountNumber','ifscCode','branchName','branchCode','workLocation','isActive'];

    for (const f of fields) {
      if (body[f] !== undefined) {
        if (['basicSalary','hra','specialAllowance'].includes(f)) updates[f] = Number(body[f]) || 0;
        else if (f === 'joiningDate') updates[f] = body[f] ? new Date(body[f]) : undefined;
        else if (f === 'isActive') updates[f] = Boolean(body[f]);
        else if (['panNumber','ifscCode'].includes(f)) updates[f] = String(body[f]).toUpperCase().trim();
        else updates[f] = String(body[f]).trim();
      }
    }

    const emp = await Employee.findByIdAndUpdate(params.id, { $set: updates }, { new: true }).lean();
    if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'UPDATE', resource: 'employee', resourceId: params.id, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ data: emp });
  } catch (err) {
    console.error('[employees PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  await connectDb();
  const emp = await Employee.findByIdAndUpdate(params.id, { $set: { deletedAt: new Date() } }, { new: true }).lean();
  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'SOFT_DELETE', resource: 'employee', resourceId: params.id, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
  return NextResponse.json({ success: true });
}
