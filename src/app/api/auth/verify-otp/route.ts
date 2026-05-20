import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import { connectDb } from '@/server/db';
import Otp from '@/server/models/Otp';
import User from '@/server/models/User';
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
    return NextResponse.json({ error: 'target and otp are required' }, { status: 400 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    await connectDb();
  } catch (err) {
    console.error('[verify-otp] db error', err);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  try {
    const found = await Otp.findOne({ target, purpose: 'login' });
    const expired = found?.expiresAt && found.expiresAt < new Date();
    const otpMatch = found
      ? timingSafeEqual(Buffer.from(found.otp), Buffer.from(otp.padEnd(found.otp.length)))
        && found.otp.length === otp.length
      : false;
    if (!found || !otpMatch || expired) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    await Otp.deleteOne({ _id: found._id });

    const user = await User.findOne({
      $or: [{ email: target }, { phone: target }],
    });

    let tokenPayload: Record<string, unknown>;
    let responseUser: Record<string, unknown> | null = null;

    if (user && user.isActive) {
      tokenPayload = { id: user._id.toString(), role: user.role };
      responseUser = {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } else {
      tokenPayload = { target, role: 'user' };
    }

    const token = jwt.sign(tokenPayload, secret, { expiresIn: '7d' });

    return NextResponse.json({ success: true, message: 'Verified', token, user: responseUser });
  } catch (err) {
    console.error('[verify-otp] error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
