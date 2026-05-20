import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import User from '@/server/models/User';
import { clean, isEmail, isNonEmptyString } from '@/server/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ROLES = ['user', 'admin'];

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const search = searchParams.get('search') ?? '';
  const role = searchParams.get('role') ?? '';

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (search) {
    const re = { $regex: search, $options: 'i' };
    filter.$or = [{ name: re }, { email: re }];
  }

  try {
    await connectDb();
    const [total, docs] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: docs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[admin/users GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = clean(body.email, 120).toLowerCase();
  const password = clean(body.password, 200);
  const name = clean(body.name, 100);
  const phone = clean(body.phone, 30);
  const role = clean(body.role, 20) || 'user';

  if (!isEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  if (!isNonEmptyString(password, 200) || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  try {
    await connectDb();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hashed, name, phone, role });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: user._id.toString(),
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[admin/users POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
