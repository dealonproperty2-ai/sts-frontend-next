import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import Application from '@/server/models/Application';
import { sendApplicationMails } from '@/server/mailer';
import { clean, isEmail, isNonEmptyString } from '@/server/validation';
import { clientKey, rateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, 'apply'), 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const name = clean(body.name, 100);
  const email = clean(body.email, 100);
  const phone = clean(body.phone, 30);
  const role = clean(body.role, 100);
  const portfolio = clean(body.portfolio, 300);
  const message = clean(body.message, 5000);

  if (!isNonEmptyString(name, 100)) {
    return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ success: false, error: 'A valid email is required' }, { status: 400 });
  }
  if (!isNonEmptyString(phone, 30)) {
    return NextResponse.json({ success: false, error: 'Phone is required' }, { status: 400 });
  }

  try {
    await connectDb();
    const sourceIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
    const userAgent = req.headers.get('user-agent') || null;
    const doc = await Application.create({
      name,
      email,
      phone,
      role,
      portfolio,
      message,
      sourceIp,
      userAgent,
    });

    sendApplicationMails({ name, email, phone, role, portfolio, message }).catch((err) =>
      console.error('[apply] mail error', err)
    );

    return NextResponse.json({
      success: true,
      message: 'Application received',
      applicationId: doc._id.toString(),
    });
  } catch (err) {
    console.error('[apply] db error', err);
    return NextResponse.json(
      { success: false, error: 'Could not save your application. Please try again.' },
      { status: 500 }
    );
  }
}
