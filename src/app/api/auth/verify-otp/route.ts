import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDb } from '@/server/db';
import Otp from '@/server/models/Otp';
import { clean } from '@/server/validation';
import { clientKey, rateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, 'verify-otp'), 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const target = clean(body.mobile ?? body.email, 120);
  const otp = clean(body.otp, 10);

  if (!target || !otp) {
    return NextResponse.json({ error: 'target and otp required' }, { status: 400 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  await connectDb();
  const found = await Otp.findOne({ target, purpose: 'login' });
  if (!found || found.otp !== otp || (found.expiresAt && found.expiresAt < new Date())) {
    return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
  }

  await Otp.deleteOne({ _id: (found as { _id: unknown })._id });

  const token = jwt.sign({ target }, secret, { expiresIn: '7d' });
  return NextResponse.json({ message: 'Verified', token });
}
