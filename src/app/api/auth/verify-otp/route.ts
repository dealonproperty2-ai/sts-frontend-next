import { NextResponse } from 'next/server';
import { timingSafeEqual, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { connectDb } from '@/server/db';
import Otp from '@/server/models/Otp';
import RefreshToken from '@/server/models/RefreshToken';
import User from '@/server/models/User';
import { clean } from '@/server/validation';
import { clientKey, rateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OTP_LENGTH = 6;

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
    const now = new Date();

    // Always run timing-safe comparison at fixed length to prevent timing attacks
    const candidateBuf = Buffer.alloc(OTP_LENGTH, ' ');
    const submittedBuf = Buffer.alloc(OTP_LENGTH, ' ');
    const storedBuf = Buffer.alloc(OTP_LENGTH, ' ');
    if (otp.length <= OTP_LENGTH) Buffer.from(otp).copy(submittedBuf);
    if (found?.otp && found.otp.length <= OTP_LENGTH) Buffer.from(found.otp).copy(storedBuf);

    // Dummy buffer for the no-match path to maintain constant time
    const dummy = randomBytes(OTP_LENGTH);
    const compareTo = found ? storedBuf : dummy;
    candidateBuf.set(submittedBuf);

    const codesMatch = timingSafeEqual(candidateBuf, compareTo);
    const notExpired = found?.expiresAt ? found.expiresAt > now : false;
    const valid = !!found && codesMatch && notExpired;

    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    await Otp.deleteOne({ _id: found._id });

    const user = await User.findOne({
      $or: [{ email: target }, { phone: target }],
    });

    let tokenPayload: Record<string, unknown>;
    let responseUser: Record<string, unknown> | null = null;

    if (user && user.isActive) {
      await User.findByIdAndUpdate(user._id, { lastLoginAt: now });
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

    const accessToken = jwt.sign(tokenPayload, secret, { expiresIn: '8h' });

    // Issue refresh token
    const rawRefresh = randomBytes(48).toString('hex');
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '';
    const ua = req.headers.get('user-agent') || '';
    await RefreshToken.create({
      userId: user?._id ?? null,
      token: rawRefresh,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ip,
      userAgent: ua,
    });

    return NextResponse.json({
      success: true,
      message: 'Verified',
      token: accessToken,
      refreshToken: rawRefresh,
      user: responseUser,
    });
  } catch (err) {
    console.error('[verify-otp] error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
