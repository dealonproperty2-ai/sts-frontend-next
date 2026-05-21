import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import RefreshToken from '@/server/models/RefreshToken';
import { audit } from '@/server/audit';
import { verifyAdmin } from '@/server/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* optional body */ }

  // Optionally verify the admin token to log the logout
  const auth = verifyAdmin(req);

  try {
    await connectDb();
    if (body.refreshToken && typeof body.refreshToken === 'string') {
      await RefreshToken.deleteOne({ token: body.refreshToken });
    }

    if (!('error' in auth)) {
      audit({
        adminId: auth.payload.id,
        adminEmail: auth.payload.email ?? '',
        action: 'LOGOUT',
        resource: 'auth',
        ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[auth/logout]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
