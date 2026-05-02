import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import Otp from '@/server/models/Otp';
import { clean } from '@/server/validation';
import { clientKey, rateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, 'send-otp'), 5, 15 * 60 * 1000);
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
  if (!target) {
    return NextResponse.json({ error: 'mobile or email is required' }, { status: 400 });
  }

  // Dev OTP: fixed 123456 (matches legacy backend behavior).
  // In production, generate cryptographically and dispatch via SMS/email.
  const otp = process.env.NODE_ENV === 'production'
    ? String(Math.floor(100000 + Math.random() * 900000))
    : '123456';

  await connectDb();
  await Otp.findOneAndUpdate(
    { target, purpose: 'login' },
    { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    { upsert: true }
  );

  // Only return the OTP in non-production for testing
  return NextResponse.json({
    message: 'OTP sent',
    ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
  });
}
