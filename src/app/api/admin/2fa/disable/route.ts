import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import User from '@/server/models/User';
import { verifyTOTP } from '@/server/totp';
import { clean } from '@/server/validation';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST: disable 2FA (requires current password + TOTP or backup code)
export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const password = clean(body.password, 200);
  const code = clean(body.code, 10);

  if (!password || !code) {
    return NextResponse.json({ error: 'password and code are required' }, { status: 400 });
  }

  try {
    await connectDb();
    const user = await User.findById(auth.payload.id);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
    }

    const pwOk = await bcrypt.compare(password, user.password);
    if (!pwOk) return NextResponse.json({ error: 'Password is incorrect' }, { status: 401 });

    const totpOk = verifyTOTP(user.twoFactorSecret, code);
    const backupIdx = user.twoFactorBackupCodes.indexOf(code.toUpperCase());
    if (!totpOk && backupIdx === -1) {
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
    }

    await User.findByIdAndUpdate(auth.payload.id, {
      twoFactorEnabled: false,
      twoFactorSecret: '',
      twoFactorBackupCodes: [],
    });

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? user.email, action: 'UPDATE', resource: 'auth', details: '2FA disabled', ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/2fa/disable POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
