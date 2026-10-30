import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import OfferLetter from '@/server/models/OfferLetter';
import { audit } from '@/server/audit';
import { isOfferStatus, normalizeOfferInput, validateOfferInput } from '@/lib/offerLetter';
import { createWithNextNumber, escapeRegex, inputToDoc, resolveEmployeeLink } from '@/server/offerLetterHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ip = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();

// GET: list with search (candidate name, offer number, employee ID, email),
// filters (department, designation, status) and pagination.
export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));
  const q           = (searchParams.get('q') ?? '').trim().slice(0, 100);
  const department  = (searchParams.get('department') ?? '').trim();
  const designation = (searchParams.get('designation') ?? '').trim();
  const status      = searchParams.get('status') ?? '';

  const filter: Record<string, unknown> = {};
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ candidateName: rx }, { offerNumber: rx }, { employeeCode: rx }, { candidateEmail: rx }];
  }
  if (department) filter.department = department;
  if (designation) filter.designation = designation;
  if (status) {
    if (!isOfferStatus(status)) return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    filter.status = status;
  }

  try {
    await connectDb();
    const [items, total, departments, designations] = await Promise.all([
      OfferLetter.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      OfferLetter.countDocuments(filter),
      OfferLetter.distinct('department'),
      OfferLetter.distinct('designation'),
    ]);
    return NextResponse.json({
      data: items,
      meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
      facets: { departments: departments.filter(Boolean).sort(), designations: designations.filter(Boolean).sort() },
    });
  } catch (err) {
    console.error('[offer-letters GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: create a new offer as a draft.
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const input = normalizeOfferInput(body);
  const fieldErrors = validateOfferInput(input, body);
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.', fieldErrors }, { status: 400 });
  }

  try {
    await connectDb();
    const link = await resolveEmployeeLink(input.employeeId);
    if (link === 'missing') {
      return NextResponse.json({ error: 'The selected employee no longer exists.', fieldErrors: { employeeId: 'Employee not found.' } }, { status: 400 });
    }
    const by = auth.payload.email ?? auth.payload.id;
    const offer = await createWithNextNumber({
      ...inputToDoc(input),
      employeeCode: link?.code ?? '',
      status: 'draft',
      statusHistory: [{ status: 'draft', at: new Date(), by }],
      createdBy: by,
    });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'CREATE', resource: 'offer-letter', resourceId: String(offer._id), details: offer.offerNumber, ip: ip(req) });
    return NextResponse.json({ data: offer }, { status: 201 });
  } catch (err) {
    console.error('[offer-letters POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
