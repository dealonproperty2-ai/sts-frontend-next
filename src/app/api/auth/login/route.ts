import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDb } from '@/server/db';
import User from '@/server/models/User';
import RefreshToken from '@/server/models/RefreshToken';
import { verifyTOTP } from '@/server/totp';
import { clean, isEmail } from '@/server/validation';
import { clientKey, rateLimit } from '@/server/rateLimit';
import { audit } from '@/server/audit';

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
  const totpCode = clean(body.totp, 10);

  if (!isEmail(email) || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  try {
    await connectDb();
  } catch (err) {
    console.error('[login] db error', err);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  try {
    const user = await User.findOne({ email });

    // Always run bcrypt to prevent timing-based user enumeration
    const dummyHash = '$2a$12$invalidhashfortimingnormalization000000000000000000000';
    const ok = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !ok) {
      return NextResponse.json({ error: 'Email or password is incorrect' }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    // 2FA check — only if enabled
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        // Signal to the client that 2FA is required (don't issue token yet)
        return NextResponse.json({ success: true, requires2FA: true });
      }
      const validTotp = verifyTOTP(user.twoFactorSecret, totpCode);
      if (!validTotp) {
        // Check backup codes
        const codeIdx = user.twoFactorBackupCodes.indexOf(totpCode.toUpperCase());
        if (codeIdx === -1) {
          return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
        }
        // Consume the backup code
        user.twoFactorBackupCodes.splice(codeIdx, 1);
        await user.save();
      }
    }

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    const accessToken = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      secret,
      { expiresIn: '8h' }
    );

    const rawRefresh = randomBytes(48).toString('hex');
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '';
    await RefreshToken.create({
      userId: user._id,
      token: rawRefresh,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ip,
      userAgent: req.headers.get('user-agent') || '',
    });

    audit({ adminId: user._id.toString(), adminEmail: user.email, action: 'LOGIN', resource: 'auth', ip });

    return NextResponse.json({
      success: true,
      token: accessToken,
      refreshToken: rawRefresh,
      user: { _id: user._id.toString(), email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('[login] error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
