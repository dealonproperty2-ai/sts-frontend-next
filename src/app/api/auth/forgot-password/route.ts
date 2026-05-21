import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { connectDb } from '@/server/db';
import User from '@/server/models/User';
import { sendPasswordResetMail } from '@/server/mailer';
import { clean, isEmail } from '@/server/validation';
import { clientKey, rateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, 'forgot-password'), 3, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email = clean(body.email, 120).toLowerCase();
  if (!isEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  // Always return success — prevents email enumeration
  const ok = { success: true, message: 'If that email is registered, a reset link has been sent.' };

  try {
    await connectDb();
    const user = await User.findOne({ email, isActive: true });
    if (!user) return NextResponse.json(ok);

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });

    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const resetUrl = `${siteUrl}/admin/reset-password?token=${token}`;
    sendPasswordResetMail(email, resetUrl).catch((err) => console.error('[forgot-password] mail error', err));

    return NextResponse.json(ok);
  } catch (err) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
