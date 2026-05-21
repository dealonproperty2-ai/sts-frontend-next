import nodemailer, { Transporter } from 'nodemailer';

let cached: Transporter | null = null;

export function getTransporter(): Transporter | null {
  if (cached) return cached;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  cached = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  return cached;
}

function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const from = () => process.env.SMTP_USER!;

const adminTo = () =>
  (process.env.ADMIN_EMAILS || 'hr@steptosoft.com')
    .split(',').map((s) => s.trim()).filter(Boolean);

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:system-ui,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:24px}
    .card{background:#fff;border-radius:8px;padding:32px;max-width:600px;margin:0 auto;border:1px solid #e5e7eb}
    h2{margin:0 0 24px;font-size:20px;color:#111}
    .row{display:flex;gap:8px;margin-bottom:8px;font-size:14px}
    .label{color:#6b7280;min-width:110px;flex-shrink:0}
    .val{color:#111;word-break:break-word}
    .msg{background:#f9fafb;border-radius:6px;padding:16px;font-size:14px;white-space:pre-wrap;margin-top:16px}
    .code{font-size:36px;letter-spacing:.3em;font-weight:700;text-align:center;padding:24px;background:#f0f4ff;border-radius:8px;color:#2563eb;margin:24px 0}
    .footer{margin-top:24px;font-size:12px;color:#9ca3af;text-align:center}
    .btn{display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px}
  </style></head><body><div class="card">
    <div style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2563eb;margin-bottom:8px">Step To Soft</div>
    <h2>${title}</h2>${body}
    <div class="footer">© ${new Date().getFullYear()} Step To Soft. All rights reserved.</div>
  </div></body></html>`;
}

// ─── Enquiry ───────────────────────────────────────────────────────────────

export async function sendEnquiryMails(p: {
  name: string; email: string; phone?: string; country?: string;
  service?: string; budget?: string; message: string;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'smtp-not-configured' as const };

  const adminHtml = wrap('New project enquiry', `
    <div class="row"><span class="label">Name</span><span class="val">${escapeHtml(p.name)}</span></div>
    <div class="row"><span class="label">Email</span><span class="val">${escapeHtml(p.email)}</span></div>
    <div class="row"><span class="label">Phone</span><span class="val">${escapeHtml(p.phone)}</span></div>
    <div class="row"><span class="label">Country</span><span class="val">${escapeHtml(p.country)}</span></div>
    <div class="row"><span class="label">Service</span><span class="val">${escapeHtml(p.service)}</span></div>
    <div class="row"><span class="label">Budget</span><span class="val">${escapeHtml(p.budget)}</span></div>
    <div class="msg">${escapeHtml(p.message)}</div>
  `);

  const userHtml = wrap('Thanks for reaching out', `
    <p style="font-size:15px">Hi ${escapeHtml(p.name)},</p>
    <p style="font-size:14px;color:#374151">Thanks for getting in touch with Step To Soft. We've received your enquiry and someone from the team will reply within one business day.</p>
    <p style="font-size:14px;color:#6b7280">— Step To Soft</p>
  `);

  await Promise.all([
    t.sendMail({ from: from(), to: adminTo(), subject: `[STS] New enquiry — ${p.name}`, html: adminHtml, replyTo: p.email }),
    t.sendMail({ from: from(), to: p.email, subject: 'Thanks for contacting Step To Soft', html: userHtml }),
  ]);
  return { sent: true as const };
}

// ─── Application ───────────────────────────────────────────────────────────

export async function sendApplicationMails(p: {
  name: string; email: string; phone: string; role: string;
  portfolio?: string; message?: string;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'smtp-not-configured' as const };

  const adminHtml = wrap('New job application', `
    <div class="row"><span class="label">Name</span><span class="val">${escapeHtml(p.name)}</span></div>
    <div class="row"><span class="label">Email</span><span class="val">${escapeHtml(p.email)}</span></div>
    <div class="row"><span class="label">Phone</span><span class="val">${escapeHtml(p.phone)}</span></div>
    <div class="row"><span class="label">Role</span><span class="val">${escapeHtml(p.role)}</span></div>
    <div class="row"><span class="label">Portfolio</span><span class="val">${escapeHtml(p.portfolio)}</span></div>
    <div class="msg">${escapeHtml(p.message)}</div>
  `);

  const userHtml = wrap('Application received', `
    <p style="font-size:15px">Hi ${escapeHtml(p.name)},</p>
    <p style="font-size:14px;color:#374151">Thanks for applying to Step To Soft${p.role ? ` for <strong>${escapeHtml(p.role)}</strong>` : ''}. We've received your application and will get back to you within 2–3 business days.</p>
    <p style="font-size:14px;color:#6b7280">— Step To Soft Team</p>
  `);

  await Promise.all([
    t.sendMail({ from: from(), to: adminTo(), subject: `[STS] Application — ${p.name} · ${p.role}`, html: adminHtml, replyTo: p.email }),
    t.sendMail({ from: from(), to: p.email, subject: 'Your application to Step To Soft', html: userHtml }),
  ]);
  return { sent: true as const };
}

// ─── OTP ────────────────────────────────────────────────────────────────────

export async function sendOtpMail(email: string, otp: string) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'smtp-not-configured' as const };
  const html = wrap('Your verification code', `
    <p style="font-size:14px;color:#374151">Enter this code to continue. It expires in 10 minutes.</p>
    <div class="code">${escapeHtml(otp)}</div>
    <p style="font-size:12px;color:#9ca3af">If you didn't request this, you can safely ignore it.</p>
  `);
  await t.sendMail({ from: from(), to: email, subject: 'Your Step To Soft OTP', html });
  return { sent: true as const };
}

// ─── Password Reset ─────────────────────────────────────────────────────────

export async function sendPasswordResetMail(email: string, resetUrl: string) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'smtp-not-configured' as const };
  const html = wrap('Reset your password', `
    <p style="font-size:14px;color:#374151">We received a request to reset the password for your Step To Soft admin account.</p>
    <p style="text-align:center;margin:28px 0"><a href="${escapeHtml(resetUrl)}" class="btn">Reset Password</a></p>
    <p style="font-size:12px;color:#9ca3af">This link expires in 1 hour. If you didn't request a reset, ignore this email — your password won't change.</p>
    <p style="font-size:12px;color:#9ca3af;word-break:break-all">Or copy this URL: ${escapeHtml(resetUrl)}</p>
  `);
  await t.sendMail({ from: from(), to: email, subject: 'Reset your Step To Soft password', html });
  return { sent: true as const };
}

// ─── 2FA enabled notification ───────────────────────────────────────────────

export async function send2FAEnabledMail(email: string, backupCodes: string[]) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'smtp-not-configured' as const };
  const codesHtml = backupCodes.map((c) => `<li style="font-family:monospace;font-size:14px">${c}</li>`).join('');
  const html = wrap('Two-factor authentication enabled', `
    <p style="font-size:14px;color:#374151">Two-factor authentication has been successfully enabled on your Step To Soft admin account.</p>
    <p style="font-size:14px;color:#374151;font-weight:600">Save these backup codes somewhere safe. Each code can only be used once.</p>
    <ul style="background:#f9fafb;border-radius:6px;padding:16px 16px 16px 32px">${codesHtml}</ul>
    <p style="font-size:12px;color:#9ca3af">If you did not enable 2FA, contact your administrator immediately.</p>
  `);
  await t.sendMail({ from: from(), to: email, subject: 'Step To Soft — 2FA enabled', html });
  return { sent: true as const };
}

// ─── Bill due-date reminders ─────────────────────────────────────────────────

export async function sendBillReminderMail(bills: Array<{
  billType: string; invoiceNumber: string; dueDate: Date; totalAmount: number;
}>) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'smtp-not-configured' as const };

  const rows = bills.map((b) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize">${escapeHtml(b.billType)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(b.invoiceNumber)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${new Date(b.dueDate).toLocaleDateString('en-IN')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">₹${Number(b.totalAmount).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const html = wrap(`Bill Payment Reminder — ${bills.length} bill${bills.length > 1 ? 's' : ''} due soon`, `
    <p style="font-size:14px;color:#374151">The following bills are due within the next 7 days:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:8px 12px;text-align:left">Type</th>
        <th style="padding:8px 12px;text-align:left">Invoice #</th>
        <th style="padding:8px 12px;text-align:left">Due Date</th>
        <th style="padding:8px 12px;text-align:left">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:12px;color:#9ca3af;margin-top:16px">Log in to the admin panel to mark bills as paid.</p>
  `);

  await t.sendMail({ from: from(), to: adminTo(), subject: `[STS] Bill reminder — ${bills.length} bill${bills.length > 1 ? 's' : ''} due soon`, html });
  return { sent: true as const };
}
