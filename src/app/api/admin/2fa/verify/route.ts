import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import User from '@/server/models/User';
import { verifyTOTP, generateBackupCodes } from '@/server/totp';
import { send2FAEnabledMail } from '@/server/mailer';
import { clean } from '@/server/validation';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST: verify TOTP code and activate 2FA
export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const code = clean(body.code, 10);
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });

  try {
    await connectDb();
    const user = await User.findById(auth.payload.id).select('email twoFactorEnabled twoFactorSecret');
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
    }
    if (!user.twoFactorSecret) {
      return NextResponse.json({ error: 'Start setup first via GET /api/admin/2fa/setup' }, { status: 400 });
    }

    if (!verifyTOTP(user.twoFactorSecret, code)) {
      return NextResponse.json({ error: 'Invalid code — check your authenticator app and try again' }, { status: 400 });
    }

    const backupCodes = generateBackupCodes(8);
    await User.findByIdAndUpdate(auth.payload.id, {
      twoFactorEnabled: true,
      twoFactorBackupCodes: backupCodes,
    });

    send2FAEnabledMail(user.email, backupCodes).catch((err) => console.error('[2fa/verify] mail error', err));
    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? user.email, action: 'UPDATE', resource: 'auth', details: '2FA enabled', ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });

    return NextResponse.json({ success: true, backupCodes });
  } catch (err) {
    console.error('[admin/2fa/verify POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
