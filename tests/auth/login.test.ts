import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { verifyAdmin } from '@/server/adminAuth';
import { generateTOTP } from '@/server/totp';
import RefreshToken from '@/server/models/RefreshToken';
import User from '@/server/models/User';
import { PASSWORD, TOTP_SECRET, createAdmin, createUser, freshIp, makeRequest, read } from '../helpers';

const doLogin = (body: unknown, ip = freshIp()) =>
  login(makeRequest('/api/auth/login', { method: 'POST', body, ip })).then(read);

async function isAdminToken(token: string) {
  const r = await verifyAdmin(makeRequest('/api/admin/me', { token }));
  return !('error' in r);
}

describe('POST /api/auth/login — password', () => {
  it('issues an access token bound to tokenVersion plus a stored refresh token', async () => {
    const admin = await createAdmin({ tokenVersion: 2 });
    const { status, body } = await doLogin({ email: admin.email, password: PASSWORD });

    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true, user: { email: admin.email, role: 'admin' } });
    const token = body!.token as string;
    expect(jwt.decode(token)).toMatchObject({ id: admin._id.toString(), role: 'admin', tv: 2 });
    expect(jwt.decode(token, { complete: true })!.header.alg).toBe('HS256');
    expect(await isAdminToken(token)).toBe(true);
    expect(await RefreshToken.countDocuments({ token: body!.refreshToken, userId: admin._id })).toBe(1);
  });

  it('normalises email case', async () => {
    const admin = await createAdmin({ email: 'mixed@test.local' });
    expect((await doLogin({ email: 'MIXED@Test.Local', password: PASSWORD })).status).toBe(200);
    expect(admin).toBeTruthy();
  });

  it('rejects a wrong password with a generic message and no token (401)', async () => {
    const admin = await createAdmin();
    const { status, body } = await doLogin({ email: admin.email, password: 'wrong-password' });
    expect(status).toBe(401);
    expect(body).toEqual({ error: 'Email or password is incorrect' });
  });

  it('gives an unknown email the same response as a wrong password (no enumeration)', async () => {
    const { status, body } = await doLogin({ email: 'nobody@test.local', password: PASSWORD });
    expect(status).toBe(401);
    expect(body).toEqual({ error: 'Email or password is incorrect' });
  });

  it('refuses a disabled account even with the right password (403)', async () => {
    const admin = await createAdmin({ isActive: false });
    const { status, body } = await doLogin({ email: admin.email, password: PASSWORD });
    expect(status).toBe(403);
    expect(body?.token).toBeUndefined();
  });

  it.each([
    [{}],
    [{ email: 'not-an-email', password: PASSWORD }],
    [{ email: 'a@test.local' }],
    [{ email: { $ne: null }, password: { $ne: null } }],
  ])('rejects invalid input %j (400)', async (body) => {
    expect((await doLogin(body)).status).toBe(400);
  });

  it('rejects a non-JSON body (400)', async () => {
    const res = await login(makeRequest('/api/auth/login', { method: 'POST', body: '{not json', ip: freshIp() }));
    expect(res.status).toBe(400);
  });

  it('a normal user can log in but the token does not grant admin access', async () => {
    const user = await createUser();
    const { status, body } = await doLogin({ email: user.email, password: PASSWORD });
    expect(status).toBe(200);
    expect(await isAdminToken(body!.token as string)).toBe(false);
  });

  it('still rate-limits repeated attempts from one IP (429 on the 11th)', async () => {
    const admin = await createAdmin();
    const ip = freshIp();
    for (let i = 0; i < 10; i++) {
      expect((await doLogin({ email: admin.email, password: 'wrong' }, ip)).status).toBe(401);
    }
    expect((await doLogin({ email: admin.email, password: PASSWORD }, ip)).status).toBe(429);
  });
});

describe('POST /api/auth/login — TOTP 2FA', () => {
  const tfaAdmin = () =>
    createAdmin({ twoFactorEnabled: true, twoFactorSecret: TOTP_SECRET, twoFactorBackupCodes: ['AAAA1111', 'BBBB2222'] });

  it('requires a second factor: password alone yields requires2FA and no token', async () => {
    const admin = await tfaAdmin();
    const { status, body } = await doLogin({ email: admin.email, password: PASSWORD });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, requires2FA: true });
    expect(await RefreshToken.countDocuments({ userId: admin._id })).toBe(0);
  });

  it('accepts a current TOTP code', async () => {
    const admin = await tfaAdmin();
    const { status, body } = await doLogin({ email: admin.email, password: PASSWORD, totp: generateTOTP(TOTP_SECRET) });
    expect(status).toBe(200);
    expect(await isAdminToken(body!.token as string)).toBe(true);
  });

  it('accepts a code from the adjacent 30s window (clock drift)', async () => {
    const admin = await tfaAdmin();
    const code = generateTOTP(TOTP_SECRET, Date.now() - 30_000);
    expect((await doLogin({ email: admin.email, password: PASSWORD, totp: code })).status).toBe(200);
  });

  it('rejects a wrong or stale TOTP code (401)', async () => {
    const admin = await tfaAdmin();
    const stale = generateTOTP(TOTP_SECRET, Date.now() - 10 * 60_000);
    expect((await doLogin({ email: admin.email, password: PASSWORD, totp: '000000' })).status).toBe(401);
    expect((await doLogin({ email: admin.email, password: PASSWORD, totp: stale })).status).toBe(401);
  });

  it('a valid TOTP code does not bypass a wrong password (401)', async () => {
    const admin = await tfaAdmin();
    const { status, body } = await doLogin({ email: admin.email, password: 'wrong', totp: generateTOTP(TOTP_SECRET) });
    expect(status).toBe(401);
    expect(body?.token).toBeUndefined();
  });

  it('accepts each backup code exactly once (case-insensitive) and consumes it', async () => {
    const admin = await tfaAdmin();
    const first = await doLogin({ email: admin.email, password: PASSWORD, totp: 'aaaa1111' });
    expect(first.status).toBe(200);
    expect(await isAdminToken(first.body!.token as string)).toBe(true);

    expect((await doLogin({ email: admin.email, password: PASSWORD, totp: 'AAAA1111' })).status).toBe(401);
    const stored = await User.findById(admin._id).lean();
    expect(stored!.twoFactorBackupCodes).toEqual(['BBBB2222']);

    expect((await doLogin({ email: admin.email, password: PASSWORD, totp: 'BBBB2222' })).status).toBe(200);
  });
});
