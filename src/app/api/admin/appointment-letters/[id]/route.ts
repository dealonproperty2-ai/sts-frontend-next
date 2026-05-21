import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import AppointmentLetter from '@/server/models/AppointmentLetter';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  await connectDb();
  const letter = await AppointmentLetter.findById(params.id).populate('employeeId').lean();
  if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: letter });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    await connectDb();

    const updates: Record<string, unknown> = {};
    const fields = ['offerDate','joiningDate','designation','department','salary','workLocation','probationPeriod','hrName','customTerms','status'];
    for (const f of fields) {
      if (body[f] !== undefined) {
        if (['offerDate','joiningDate'].includes(f)) updates[f] = new Date(body[f]);
        else if (f === 'salary') updates[f] = Number(body[f]) || 0;
        else updates[f] = body[f];
      }
    }

    const letter = await AppointmentLetter.findByIdAndUpdate(params.id, { $set: updates }, { new: true }).lean();
    if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'UPDATE', resource: 'appointment-letter', resourceId: params.id, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
    return NextResponse.json({ data: letter });
  } catch (err) {
    console.error('[appointment-letters PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;
  await connectDb();
  const letter = await AppointmentLetter.findByIdAndDelete(params.id).lean();
  if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'DELETE', resource: 'appointment-letter', resourceId: params.id, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });
  return NextResponse.json({ success: true });
}
