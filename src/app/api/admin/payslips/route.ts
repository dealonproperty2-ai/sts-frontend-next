import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import PaySlip from '@/server/models/PaySlip';
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
  const month      = searchParams.get('month');

  await connectDb();

  const filter: Record<string, unknown> = {};
  if (employeeId) filter.employeeId = employeeId;
  if (month)      filter.month      = month;

  const [items, total] = await Promise.all([
    PaySlip.find(filter)
      .populate('employeeId', 'name employeeId designation department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PaySlip.countDocuments(filter),
  ]);

  return NextResponse.json({ data: items, meta: { total, page, pages: Math.ceil(total / limit) } });
}

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    await connectDb();

    const basic     = Number(body.basicSalary)     || 0;
    const hra       = Number(body.hra)             || 0;
    const special   = Number(body.specialAllowance)|| 0;
    const bonus     = Number(body.bonus)           || 0;
    const pf        = Number(body.pfDeduction)     || 0;
    const pt        = Number(body.professionalTax) || 0;
    const other     = Number(body.otherDeductions) || 0;
    const gross     = basic + hra + special + bonus;
    const totalDed  = pf + pt + other;
    const net       = gross - totalDed;

    const slip = await PaySlip.create({
      employeeId:      body.employeeId,
      month:           body.month,
      workingDays:     Number(body.workingDays) || 26,
      basicSalary:     basic,
      hra,
      specialAllowance:special,
      bonus,
      grossSalary:     gross,
      pfDeduction:     pf,
      professionalTax: pt,
      otherDeductions: other,
      totalDeductions: totalDed,
      netSalary:       net,
    });

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'CREATE', resource: 'payslip', resourceId: String(slip._id), ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ data: slip }, { status: 201 });
  } catch (err: unknown) {
    console.error('[payslips POST]', err);
    const msg = err instanceof Error && err.message.includes('duplicate') ? 'Payslip for this employee and month already exists' : 'Server error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
