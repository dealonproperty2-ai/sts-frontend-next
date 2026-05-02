import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDb } from '@/server/db';
import User from '@/server/models/User';
import { clean, isEmail } from '@/server/validation';
import { clientKey, rateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, 'login'), 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = clean(body.email, 120).toLowerCase();
  const password = clean(body.password, 200);
  if (!isEmail(email) || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  await connectDb();
  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: 'Email or password is incorrect' }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return NextResponse.json({ error: 'Email or password is incorrect' }, { status: 401 });
  }

  const token = jwt.sign({ id: user._id.toString(), role: user.role }, secret, { expiresIn: '1h' });

  return NextResponse.json({
    success: true,
    token,
    user: { _id: user._id.toString(), email: user.email, role: user.role },
  });
}
