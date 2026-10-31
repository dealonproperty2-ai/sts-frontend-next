import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import OfferLetter from '@/server/models/OfferLetter';
import { audit } from '@/server/audit';
import { ACCEPTANCE_EDITABLE_STATUSES, normalizeOfferInput, validateAcceptance, validateOfferInput } from '@/lib/offerLetter';
import { acceptanceToDoc, inputToDoc, offerToInput, resolveEmployeeLink } from '@/server/offerLetterHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ip = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
const badId = () => NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
const ACCEPTANCE_KEYS = new Set(['acceptanceDate', 'acceptancePlace']);

export async function GET(req: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const auth = await verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const offer = await OfferLetter.findById(params.id).lean();
    if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: offer });
  } catch (err) {
    console.error('[offer-letters/:id GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH: edit a DRAFT offer. Fields not sent keep their stored values; once an
// offer has been sent its content is frozen (only its status can change),
// except that the candidate's acceptance date/place may still be recorded on a
// sent or accepted offer. Recording them never changes the status.
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
    const existing = await OfferLetter.findById(params.id).lean();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.status !== 'draft') {
      const acceptanceOnly = Object.keys(body).every((k) => ACCEPTANCE_KEYS.has(k));
      if (!acceptanceOnly || !ACCEPTANCE_EDITABLE_STATUSES.includes(existing.status)) {
        return NextResponse.json({ error: `This offer is ${existing.status} and can no longer be edited.` }, { status: 409 });
      }
      const input = normalizeOfferInput({ ...offerToInput(existing), ...body });
      const fieldErrors = validateAcceptance(input, body);
      if (Object.keys(fieldErrors).length) {
        return NextResponse.json({ error: 'Please correct the highlighted fields.', fieldErrors }, { status: 400 });
      }
      const updated = await OfferLetter.findOneAndUpdate(
        { _id: params.id, status: existing.status },
        { $set: acceptanceToDoc(input) },
        { new: true },
      ).lean();
      if (!updated) return NextResponse.json({ error: 'This offer was changed by someone else. Reload and try again.' }, { status: 409 });
      audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'UPDATE', resource: 'offer-letter', resourceId: params.id, details: `${updated.offerNumber} acceptance details`, ip: ip(req) });
      return NextResponse.json({ data: updated });
    }

    const input = normalizeOfferInput({ ...offerToInput(existing), ...body });
    const fieldErrors = validateOfferInput(input, body);
    if (Object.keys(fieldErrors).length) {
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fieldErrors }, { status: 400 });
    }
    const link = await resolveEmployeeLink(input.employeeId);
    if (link === 'missing') {
      return NextResponse.json({ error: 'The selected employee no longer exists.', fieldErrors: { employeeId: 'Employee not found.' } }, { status: 400 });
    }

    // Only update while still a draft (guards against a concurrent status change).
    const updated = await OfferLetter.findOneAndUpdate(
      { _id: params.id, status: 'draft' },
      { $set: { ...inputToDoc(input), employeeCode: link?.code ?? '' } },
      { new: true },
    ).lean();
    if (!updated) return NextResponse.json({ error: 'This offer was changed by someone else. Reload and try again.' }, { status: 409 });

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'UPDATE', resource: 'offer-letter', resourceId: params.id, details: updated.offerNumber, ip: ip(req) });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[offer-letters/:id PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE: only drafts can be deleted; issued offers are kept as history.
export async function DELETE(req: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const auth = await verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return badId();

  try {
    await connectDb();
    const existing = await OfferLetter.findById(params.id).select('status offerNumber').lean();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft offers can be deleted. Revoke an issued offer instead.' }, { status: 409 });
    }
    const res = await OfferLetter.deleteOne({ _id: params.id, status: 'draft' });
    if (!res.deletedCount) return NextResponse.json({ error: 'This offer was changed by someone else. Reload and try again.' }, { status: 409 });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'DELETE', resource: 'offer-letter', resourceId: params.id, details: existing.offerNumber, ip: ip(req) });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[offer-letters/:id DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
