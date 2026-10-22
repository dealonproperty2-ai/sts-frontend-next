import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { verifyAdmin } from '@/server/adminAuth';
import { TEST_JWT_SECRET, createAdmin, freshIp, makeRequest, read } from '../helpers';

// Regression for the Phase 1 finding: /api/auth/verify-otp issued a JWT carrying
// the user's real role (incl. admin) from an emailed OTP alone — no password,
// no 2FA — and outside production the OTP was always "123456".

const API_DIR = path.join(process.cwd(), 'src', 'app', 'api');
const allRoutes = (fs.readdirSync(API_DIR, { recursive: true }) as string[])
  .filter((f) => path.basename(f) === 'route.ts')
  .map((f) => f.split(path.sep).join('/'));

describe('OTP login flow is gone', () => {
  it('no API route path contains an otp segment', () => {
    expect(allRoutes.length).toBeGreaterThan(50);
    expect(allRoutes.filter((r) => /(^|\/)[^/]*otp[^/]*\//i.test(r) && !/2fa/.test(r))).toEqual([]);
  });

  it('no application code still references the OTP endpoints, model or mailer', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx|js|mjs)$/.test(e.name) && /send-otp|verify-otp|models\/Otp|sendOtpMail/.test(fs.readFileSync(p, 'utf8'))) {
          offenders.push(path.relative(process.cwd(), p));
        }
      }
    };
    walk(path.join(process.cwd(), 'src'));
    expect(offenders).toEqual([]);
  });

  it('loading every API route registers no Otp model', async () => {
    for (const r of allRoutes) await import(/* @vite-ignore */ `/src/app/api/${r}`);
    expect(mongoose.modelNames()).not.toContain('Otp');
  });

  it('no public auth endpoint issues a token for an OTP-style request', async () => {
    const admin = await createAdmin();
    const otpBodies = [
      { email: admin.email, otp: '123456' },
      { mobile: admin.email, otp: '123456' },
      { email: admin.email, totp: '123456' },
      { email: admin.email, otp: '123456', password: '' },
    ];
    for (const r of allRoutes.filter((x) => x.startsWith('auth/'))) {
      const mod = (await import(/* @vite-ignore */ `/src/app/api/${r}`)) as { POST?: (req: Request) => Promise<Response> };
      if (!mod.POST) continue;
      for (const body of otpBodies) {
        const res = await read(await mod.POST(makeRequest(`/api/${r}`, { method: 'POST', body, ip: freshIp() })));
        expect(res.body?.token, `${r} ${JSON.stringify(body)}`).toBeUndefined();
        expect(res.body?.refreshToken, `${r} ${JSON.stringify(body)}`).toBeUndefined();
      }
    }
  });

  it('tokens shaped like the old OTP flow output are rejected by admin auth', async () => {
    const admin = await createAdmin();
    // Old flow for an unknown target: { target, role: 'user' } — no user id.
    const unknownTarget = jwt.sign({ target: admin.email, role: 'user' }, TEST_JWT_SECRET, { expiresIn: '8h' });
    // Old flow with role escalation attempt via target claim.
    const targetAdmin = jwt.sign({ target: admin.email, role: 'admin' }, TEST_JWT_SECRET, { expiresIn: '8h' });
    for (const t of [unknownTarget, targetAdmin]) {
      const r = await verifyAdmin(makeRequest('/api/admin/me', { token: t }));
      expect('error' in r && r.error.status).toBe(401);
    }
  });
});
