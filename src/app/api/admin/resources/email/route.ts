import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import path from 'path';
import { readFile } from 'fs/promises';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Resource from '@/server/models/Resource';
import { uploadDir } from '@/server/resourceHelpers';
import { getTransporter } from '@/server/mailer';
import { isEmail, clean } from '@/server/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const safe = (s: string) => (s || 'resource').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'resource';
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Sends the selected candidate profiles (resume attachments + a summary table)
// to a client email address.
export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: { ids?: unknown; to?: unknown; subject?: unknown; message?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const to = clean(body.to, 200);
  if (!isEmail(to)) return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => mongoose.Types.ObjectId.isValid(String(x))) : [];
  if (!ids.length) return NextResponse.json({ error: 'No resources selected' }, { status: 400 });

  const transporter = getTransporter();
  if (!transporter) return NextResponse.json({ error: 'Email is not configured (set SMTP_USER / SMTP_PASS)' }, { status: 503 });

  const subject = clean(body.subject, 200) || 'Candidate profiles from Step To Soft Pvt. Ltd.';
  const message = clean(body.message, 4000);

  try {
    await connectDb();
    const rows = await Resource.find({ _id: { $in: ids } }).lean();
    if (!rows.length) return NextResponse.json({ error: 'No matching resources' }, { status: 404 });

    const attachments: { filename: string; content: Buffer }[] = [];
    const used = new Set<string>();
    for (const r of rows) {
      if (!r.resumeUrl) continue;
      const filename = path.basename(r.resumeUrl);
      if (!filename || filename.includes('..')) continue;
      try {
        const buf = await readFile(path.join(uploadDir(), filename));
        const ext = (r.resumeName?.split('.').pop() || filename.split('.').pop() || 'pdf').toLowerCase();
        let name = `${safe(r.fullName || 'candidate')}-Resume.${ext}`;
        let n = 2; while (used.has(name)) name = `${safe(r.fullName || 'candidate')}-Resume-${n++}.${ext}`;
        used.add(name);
        attachments.push({ filename: name, content: buf });
      } catch { /* skip missing file */ }
    }

    const rowsHtml = rows.map((r) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(r.fullName)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(r.designation)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(r.experienceYears)} yrs</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(r.primaryTechnology)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(r.availabilityStatus)}</td>
      </tr>`).join('');

    const html = `<div style="font-family:system-ui,sans-serif;color:#111;max-width:680px">
      <div style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2563eb">Step To Soft Pvt. Ltd.</div>
      <h2 style="margin:8px 0 16px">Candidate Submission</h2>
      ${message ? `<p style="white-space:pre-wrap">${esc(message)}</p>` : ''}
      <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:12px">
        <tr style="text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase">
          <th style="padding:8px">Name</th><th style="padding:8px">Role</th><th style="padding:8px">Exp</th>
          <th style="padding:8px">Primary</th><th style="padding:8px">Availability</th>
        </tr>${rowsHtml}
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:16px">${attachments.length} resume(s) attached.</p>
    </div>`;

    await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, html, attachments });
    return NextResponse.json({ success: true, sent: rows.length, attached: attachments.length });
  } catch (err) {
    console.error('[admin/resources/email POST]', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
