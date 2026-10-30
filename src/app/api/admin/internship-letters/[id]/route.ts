import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import InternshipLetter from '@/server/models/InternshipLetter';
import { audit } from '@/server/audit';
import { normalizeInternshipInput, validateInternshipInput } from '@/lib/internshipLetter';
import { inputToDoc, letterToInput, resolveEmployeeLink } from '@/server/internshipLetterHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ip = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
const badId = () => NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

export async function GET(req: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const auth = await verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const letter = await InternshipLetter.findById(params.id).lean();
    if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: letter });
  } catch (err) {
    console.error('[internship-letters/:id GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH: edit a saved letter. Fields not sent keep their stored values.
export async function PATCH(req: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const auth = await verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  try {
    await connectDb();
    const existing = await InternshipLetter.findById(params.id).lean();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const input = normalizeInternshipInput({ ...letterToInput(existing), ...body });
    const fieldErrors = validateInternshipInput(input, body);
    if (Object.keys(fieldErrors).length) {
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fieldErrors }, { status: 400 });
    }
    const link = await resolveEmployeeLink(input.employeeId);
    if (link === 'missing') {
      return NextResponse.json({ error: 'The selected employee no longer exists.', fieldErrors: { employeeId: 'Employee not found.' } }, { status: 400 });
    }

    const updated = await InternshipLetter.findByIdAndUpdate(params.id, { $set: { ...inputToDoc(input), employeeCode: link?.code ?? '' } }, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'UPDATE', resource: 'internship-letter', resourceId: params.id, details: updated.internName, ip: ip(req) });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[internship-letters/:id PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const auth = await verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const deleted = await InternshipLetter.findByIdAndDelete(params.id).select('internName').lean();
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'DELETE', resource: 'internship-letter', resourceId: params.id, details: deleted.internName, ip: ip(req) });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[internship-letters/:id DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
