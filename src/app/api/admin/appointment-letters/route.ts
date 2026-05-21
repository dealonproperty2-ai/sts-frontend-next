import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import AppointmentLetter from '@/server/models/AppointmentLetter';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit      = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));
  const employeeId = searchParams.get('employeeId');

  await connectDb();

  const filter: Record<string, unknown> = {};
  if (employeeId) filter.employeeId = employeeId;

  const [items, total] = await Promise.all([
    AppointmentLetter.find(filter)
      .populate('employeeId', 'name employeeId designation department fatherName address email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AppointmentLetter.countDocuments(filter),
  ]);

  return NextResponse.json({ data: items, meta: { total, page, pages: Math.ceil(total / limit) } });
}

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    await connectDb();

    const letter = await AppointmentLetter.create({
      employeeId:     body.employeeId,
      offerDate:      new Date(body.offerDate),
      joiningDate:    new Date(body.joiningDate),
      designation:    body.designation?.trim(),
      department:     body.department?.trim() ?? '',
      salary:         Number(body.salary) || 0,
      workLocation:   body.workLocation?.trim() ?? '',
      probationPeriod:body.probationPeriod?.trim() ?? '3 (Three) months',
      hrName:         body.hrName?.trim() ?? 'Naheed Zakia',
      customTerms:    body.customTerms?.trim() ?? '',
    });

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'CREATE', resource: 'appointment-letter', resourceId: String(letter._id), ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ data: letter }, { status: 201 });
  } catch (err) {
    console.error('[appointment-letters POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
