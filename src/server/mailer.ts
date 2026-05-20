import nodemailer, { Transporter } from 'nodemailer';

let cached: Transporter | null = null;

export function getTransporter(): Transporter | null {
  if (cached) return cached;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  cached = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return cached;
}

interface EnquiryPayload {
  name: string;
  email: string;
  phone?: string;
  country?: string;
  service?: string;
  budget?: string;
  message: string;
}

export async function sendEnquiryMails(p: EnquiryPayload) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'smtp-not-configured' as const };

  const adminTo = (process.env.ADMIN_EMAILS || 'hr@steptosoft.com,info@steptosoft.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const adminHtml = `
    <h2>New project enquiry</h2>
    <p><b>Name:</b> ${escapeHtml(p.name)}</p>
    <p><b>Email:</b> ${escapeHtml(p.email)}</p>
    <p><b>Phone:</b> ${escapeHtml(p.phone ?? '')}</p>
    <p><b>Country:</b> ${escapeHtml(p.country ?? '')}</p>
    <p><b>Service:</b> ${escapeHtml(p.service ?? '')}</p>
    <p><b>Budget:</b> ${escapeHtml(p.budget ?? '')}</p>
    <h3>Message</h3>
    <p style="white-space:pre-wrap">${escapeHtml(p.message)}</p>
  `;

  const userHtml = `
    <p>Hi ${escapeHtml(p.name)},</p>
    <p>Thanks for getting in touch with Step To Soft. We've received your enquiry and someone from the team will reply within one business day.</p>
    <p>— Step To Soft</p>
  `;

  const from = process.env.SMTP_USER!;

  await t.sendMail({
    from,
    to: adminTo,
    subject: `[STS] New enquiry — ${p.name}`,
    html: adminHtml,
    replyTo: p.email,
  });

  await t.sendMail({
    from,
    to: p.email,
    subject: 'Thanks for contacting Step To Soft',
    html: userHtml,
  });

  return { sent: true as const };
}

export async function sendApplicationMails(p: {
  name: string;
  email: string;
  phone: string;
  role: string;
  portfolio?: string;
  message?: string;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'smtp-not-configured' as const };

  const adminTo = (process.env.ADMIN_EMAILS || 'hr@steptosoft.com,info@steptosoft.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const adminHtml = `
    <h2>New application</h2>
    <p><b>Name:</b> ${escapeHtml(p.name)}</p>
    <p><b>Email:</b> ${escapeHtml(p.email)}</p>
    <p><b>Phone:</b> ${escapeHtml(p.phone)}</p>
    <p><b>Applying for:</b> ${escapeHtml(p.role)}</p>
    <p><b>Portfolio:</b> ${escapeHtml(p.portfolio ?? '')}</p>
    <h3>Message</h3>
    <p style="white-space:pre-wrap">${escapeHtml(p.message ?? '')}</p>
  `;

  const confirmHtml = `
    <p>Hi ${escapeHtml(p.name)},</p>
    <p>Thanks for applying to Step To Soft! We've received your application${p.role ? ` for <b>${escapeHtml(p.role)}</b>` : ''} and will get back to you within 2–3 business days.</p>
    <p>— Step To Soft Team</p>
  `;

  const from = process.env.SMTP_USER!;

  await t.sendMail({
    from,
    to: adminTo,
    subject: `[STS] New application — ${p.name} · ${p.role}`,
    html: adminHtml,
    replyTo: p.email,
  });

  await t.sendMail({
    from,
    to: p.email,
    subject: 'Your application to Step To Soft',
    html: confirmHtml,
  });

  return { sent: true as const };
}

export async function sendOtpMail(email: string, otp: string) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'smtp-not-configured' as const };

  const html = `
    <p>Your Step To Soft verification code is:</p>
    <h1 style="letter-spacing:0.2em">${escapeHtml(otp)}</h1>
    <p>This code expires in 10 minutes. Do not share it with anyone.</p>
    <p>— Step To Soft</p>
  `;

  await t.sendMail({
    from: process.env.SMTP_USER!,
    to: email,
    subject: 'Your Step To Soft OTP',
    html,
  });

  return { sent: true as const };
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
