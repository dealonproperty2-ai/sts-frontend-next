import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { connectDb } from '@/server/db';
import Otp from '@/server/models/Otp';
import { sendOtpMail } from '@/server/mailer';
import { clean, isEmail } from '@/server/validation';
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

  const otp =
    process.env.NODE_ENV === 'production'
      ? String(randomInt(100000, 1000000))
      : '123456';

  try {
    await connectDb();
    await Otp.findOneAndUpdate(
      { target, purpose: 'login' },
      { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true }
    );
  } catch (err) {
    console.error('[send-otp] db error', err);
    return NextResponse.json({ error: 'Could not process request' }, { status: 500 });
  }

  if (process.env.NODE_ENV === 'production' && isEmail(target)) {
    sendOtpMail(target, otp).catch((err) => console.error('[send-otp] mail error', err));
  }

  return NextResponse.json({
    message: 'OTP sent',
    ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
  });
}
