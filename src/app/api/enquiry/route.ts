import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import Enquiry from '@/server/models/Enquiry';
import { sendEnquiryMails } from '@/server/mailer';
import { clean, isEmail, isNonEmptyString } from '@/server/validation';
import { clientKey, rateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, 'enquiry'), 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
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
  const country = clean(body.country, 60);
  const service = clean(body.service, 100);
  const budget = clean(body.budget, 60);
  const message = clean(body.message, 5000);

  if (!isNonEmptyString(name, 100)) {
    return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ success: false, error: 'A valid email is required' }, { status: 400 });
  }
  if (!isNonEmptyString(message, 5000)) {
    return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
  }

  if (!process.env.MONGODB_URI) {
    console.error('[enquiry] MONGODB_URI is not set — create .env.local');
    return NextResponse.json(
      { success: false, error: 'Server is not configured. Please contact support.' },
      { status: 503 }
    );
  }

  try {
    await connectDb();
    const sourceIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
    const userAgent = req.headers.get('user-agent') || null;
    await Enquiry.create({ name, email, phone, country, service, budget, message, sourceIp, userAgent });
  } catch (err) {
    console.error('[enquiry] db error', err);
    return NextResponse.json(
      { success: false, error: 'Could not save your enquiry. Please try again.' },
      { status: 500 }
    );
  }

  sendEnquiryMails({ name, email, phone, country, service, budget, message }).catch((err) =>
    console.error('[enquiry] mail error', err)
  );

  return NextResponse.json({ success: true, message: 'Enquiry received' });
}
