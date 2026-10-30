import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import ExperienceLetter from '@/server/models/ExperienceLetter';
import { audit } from '@/server/audit';
import { normalizeExperienceInput, validateExperienceInput } from '@/lib/experienceLetter';
import { inputToDoc, resolveEmployeeLink } from '@/server/experienceLetterHelpers';
import { escapeRegex } from '@/server/offerLetterHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ip = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();

// GET: list with search (employee name, ID, designation, department) and pagination.
// The (possibly large) uploaded logo/signature images are left out of the list.
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
    filter.$or = [{ employeeName: rx }, { employeeCode: rx }, { designation: rx }, { department: rx }];
  }

  try {
    await connectDb();
    const [items, total] = await Promise.all([
      ExperienceLetter.find(filter).select('-logoData -signatureData').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ExperienceLetter.countDocuments(filter),
    ]);
    return NextResponse.json({ data: items, meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (err) {
    console.error('[experience-letters GET]', err);
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

  const input = normalizeExperienceInput(body);
  const fieldErrors = validateExperienceInput(input, body);
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
    const letter = await ExperienceLetter.create({ ...inputToDoc(input), createdBy: by });
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'CREATE', resource: 'experience-letter', resourceId: String(letter._id), details: letter.employeeName, ip: ip(req) });
    return NextResponse.json({ data: letter }, { status: 201 });
  } catch (err) {
    console.error('[experience-letters POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
