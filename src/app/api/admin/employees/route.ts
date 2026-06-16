import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Employee from '@/server/models/Employee';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit  = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));
  const search = searchParams.get('search') ?? '';
  const active = searchParams.get('active');

  await connectDb();

  const filter: Record<string, unknown> = { deletedAt: null };
  if (active === 'false') filter.isActive = false;
  if (search) {
    filter.$or = [
      { name:        { $regex: search, $options: 'i' } },
      { email:       { $regex: search, $options: 'i' } },
      { designation: { $regex: search, $options: 'i' } },
      { department:  { $regex: search, $options: 'i' } },
      { employeeId:  { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Employee.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Employee.countDocuments(filter),
  ]);

  return NextResponse.json({ data: items, meta: { total, page, pages: Math.ceil(total / limit) } });
}

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    await connectDb();

    const emp = await Employee.create({
      // Admin-supplied employee number; blank falls back to auto-generation (pre-save hook).
      employeeId:      body.employeeId?.trim() || undefined,
      name:            body.name?.trim(),
      fatherName:      body.fatherName?.trim() ?? '',
      email:           body.email?.trim().toLowerCase() ?? '',
      phone:           body.phone?.trim() ?? '',
      address:         body.address?.trim() ?? '',
      designation:     body.designation?.trim(),
      department:      body.department?.trim() ?? '',
      joiningDate:     body.joiningDate ? new Date(body.joiningDate) : undefined,
      basicSalary:     Number(body.basicSalary) || 0,
      hra:             Number(body.hra) || 0,
      specialAllowance:Number(body.specialAllowance) || 0,
      panNumber:       body.panNumber?.trim().toUpperCase() ?? '',
      uanNumber:       body.uanNumber?.trim() ?? '',
      pfNumber:        body.pfNumber?.trim() ?? '',
      bankName:        body.bankName?.trim() ?? '',
      accountNumber:   body.accountNumber?.trim() ?? '',
      ifscCode:        body.ifscCode?.trim().toUpperCase() ?? '',
      branchName:      body.branchName?.trim() ?? '',
      branchCode:      body.branchCode?.trim() ?? '',
      workLocation:    body.workLocation?.trim() ?? '',
    });

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'CREATE', resource: 'employee', resourceId: String(emp._id), ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ data: emp }, { status: 201 });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'That employee number is already in use' }, { status: 409 });
    }
    console.error('[employees POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
