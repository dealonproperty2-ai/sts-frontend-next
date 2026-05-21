import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import User from '@/server/models/User';
import { generateBase32Secret, otpAuthUri } from '@/server/totp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: generate a new TOTP secret (not yet saved — admin must verify first)
export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    await connectDb();
    const user = await User.findById(auth.payload.id).select('email twoFactorEnabled');
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
    }

    const secret = generateBase32Secret();
    const uri = otpAuthUri(secret, user.email);

    // Store the pending secret temporarily (they must verify before it's activated)
    await User.findByIdAndUpdate(auth.payload.id, { twoFactorSecret: secret });

    return NextResponse.json({ success: true, data: { secret, uri } });
  } catch (err) {
    console.error('[admin/2fa/setup GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
