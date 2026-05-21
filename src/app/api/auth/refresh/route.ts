import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { connectDb } from '@/server/db';
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
    const stored = await RefreshToken.findOne({ token: refreshToken });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await stored.deleteOne();
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    if (!stored.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await User.findById(stored.userId);
    if (!user || !user.isActive) {
      await stored.deleteOne();
      return NextResponse.json({ error: 'Account not found or disabled' }, { status: 401 });
    }

    // Rotate refresh token
    await stored.deleteOne();
    const newRaw = randomBytes(48).toString('hex');
    await RefreshToken.create({
      userId: user._id,
      token: newRaw,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '',
      userAgent: req.headers.get('user-agent') || '',
    });

    const accessToken = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      secret,
      { expiresIn: '8h' }
    );

    return NextResponse.json({ success: true, token: accessToken, refreshToken: newRaw });
  } catch (err) {
    console.error('[auth/refresh]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
