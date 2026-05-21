import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDb } from '@/server/db';
import User from '@/server/models/User';
import RefreshToken from '@/server/models/RefreshToken';
import { clean, isNonEmptyString } from '@/server/validation';
import { clientKey, rateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, 'reset-password'), 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const token = clean(body.token, 80);
  const password = clean(body.password, 200);

  if (!token) return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
  if (!isNonEmptyString(password, 200) || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  try {
    await connectDb();
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
      isActive: true,
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(user._id, {
      password: hashed,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    // Invalidate all refresh tokens for this user
    await RefreshToken.deleteMany({ userId: user._id });

    return NextResponse.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
