import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import OfferLetter from '@/server/models/OfferLetter';
import { audit } from '@/server/audit';
import { canTransition, isDeadlinePassed, isOfferStatus, todayLocalISO, OFFER_TRANSITIONS } from '@/lib/offerLetter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { status }: move an offer along its workflow (see OFFER_TRANSITIONS).
export async function POST(req: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const auth = await verifyAdmin(req);
  if ('error' in auth) return auth.error;
  if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const next = body?.status;
  if (!isOfferStatus(next)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  try {
    await connectDb();
    const offer = await OfferLetter.findById(params.id).select('status validUntil offerNumber').lean();
    if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!canTransition(offer.status, next)) {
      const allowed = OFFER_TRANSITIONS[offer.status];
      return NextResponse.json({
        error: allowed.length
          ? `A ${offer.status} offer can only be marked: ${allowed.join(', ')}.`
          : `This offer is ${offer.status}; its status can no longer change.`,
      }, { status: 409 });
    }
    if (next === 'expired' && !isDeadlinePassed(offer.validUntil.toISOString(), todayLocalISO())) {
      return NextResponse.json({ error: 'The acceptance deadline has not passed yet.' }, { status: 409 });
    }

    // Conditional update: succeeds only if nobody changed the status meanwhile.
    const updated = await OfferLetter.findOneAndUpdate(
      { _id: params.id, status: offer.status },
      { $set: { status: next }, $push: { statusHistory: { status: next, at: new Date(), by: auth.payload.email ?? auth.payload.id } } },
      { new: true },
    ).lean();
    if (!updated) return NextResponse.json({ error: 'This offer was changed by someone else. Reload and try again.' }, { status: 409 });

    audit({
      adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'UPDATE', resource: 'offer-letter',
      resourceId: params.id, details: `${offer.offerNumber}: ${offer.status} → ${next}`,
      ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim(),
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[offer-letters/:id/status POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
