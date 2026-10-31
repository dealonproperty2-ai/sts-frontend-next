import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import InternshipLetter from '@/server/models/InternshipLetter';
import { audit } from '@/server/audit';
import { normalizeInternshipInput, validateInternshipInput } from '@/lib/internshipLetter';
import { inputToDoc, resolveEmployeeLink } from '@/server/internshipLetterHelpers';
import { escapeRegex } from '@/server/offerLetterHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ip = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();

// GET: list with search (intern name, role, employee ID) and pagination.
// The (possibly large) custom logo is left out of the list.
export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));
  const q     = (searchParams.get('q') ?? '').trim().slice(0, 100);

  const filter: Record<string, unknown> = {};
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ internName: rx }, { role: rx }, { employeeCode: rx }, { technologies: rx }];
  }

  try {
    await connectDb();
    const [items, total] = await Promise.all([
      InternshipLetter.find(filter).select('-logoData').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      InternshipLetter.countDocuments(filter),
    ]);
    return NextResponse.json({ data: items, meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (err) {
    console.error('[internship-letters GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: save a generated letter.
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const input = normalizeInternshipInput(body);
  const fieldErrors = validateInternshipInput(input, body);
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
    const letter = await InternshipLetter.create({ ...inputToDoc(input), employeeCode: link?.code ?? '', createdBy: by });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'CREATE', resource: 'internship-letter', resourceId: String(letter._id), details: letter.internName, ip: ip(req) });
    return NextResponse.json({ data: letter }, { status: 201 });
  } catch (err) {
    console.error('[internship-letters POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
