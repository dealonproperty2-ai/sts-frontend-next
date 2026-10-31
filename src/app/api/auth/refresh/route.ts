import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { connectDb } from '@/server/db';
import { signAccessToken } from '@/server/adminAuth';
import RefreshToken from '@/server/models/RefreshToken';
import User from '@/server/models/User';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { refreshToken } = body;
  if (!refreshToken || typeof refreshToken !== 'string') {
    return NextResponse.json({ error: 'refreshToken is required' }, { status: 400 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  try {
    await connectDb();
    // Consume atomically so a refresh token can be used at most once, even
    // under concurrent requests.
    const stored = await RefreshToken.findOneAndDelete({ token: refreshToken });

    if (!stored || stored.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    if (!stored.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await User.findById(stored.userId);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Account not found or disabled' }, { status: 401 });
    }

    // Rotate refresh token
    const newRaw = randomBytes(48).toString('hex');
    await RefreshToken.create({
      userId: user._id,
      token: newRaw,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '',
      userAgent: req.headers.get('user-agent') || '',
    });

    const accessToken = signAccessToken(user, secret);

    return NextResponse.json({ success: true, token: accessToken, refreshToken: newRaw });
  } catch (err) {
    console.error('[auth/refresh]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
