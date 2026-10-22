import { describe, expect, it } from 'vitest';
import { GET as setup2fa } from '@/app/api/admin/2fa/setup/route';
import { POST as verify2fa } from '@/app/api/admin/2fa/verify/route';
import { POST as disable2fa } from '@/app/api/admin/2fa/disable/route';
import { POST as login } from '@/app/api/auth/login/route';
import { send2FAEnabledMail } from '@/server/mailer';
import { generateTOTP } from '@/server/totp';
import User from '@/server/models/User';
import { PASSWORD, createAdmin, createUser, freshIp, makeRequest, read, tokenFor } from '../helpers';

const doLogin = (body: unknown) =>
  login(makeRequest('/api/auth/login', { method: 'POST', body, ip: freshIp() })).then(read);

describe('2FA enrolment and removal (admin settings)', () => {
  it('setup → verify enables 2FA, after which login demands the second factor', async () => {
    const admin = await createAdmin();
    const token = tokenFor(admin);

    const setup = await read(await setup2fa(makeRequest('/api/admin/2fa/setup', { token })));
    expect(setup.status).toBe(200);
    const { secret, uri } = setup.body!.data as { secret: string; uri: string };
    expect(uri).toContain('otpauth://totp/');
    expect(secret).toMatch(/^[A-Z2-7]+=*$/);

    const wrong = await verify2fa(makeRequest('/api/admin/2fa/verify', { method: 'POST', token, body: { code: '000000' } }));
    expect(wrong.status).toBe(400);

    const ok = await read(
      await verify2fa(makeRequest('/api/admin/2fa/verify', { method: 'POST', token, body: { code: generateTOTP(secret) } }))
    );
    expect(ok.status).toBe(200);
    const backupCodes = ok.body!.backupCodes as string[];
    expect(backupCodes).toHaveLength(8);
    expect(send2FAEnabledMail).toHaveBeenCalledWith(admin.email, backupCodes);

    expect((await doLogin({ email: admin.email, password: PASSWORD })).body).toEqual({ success: true, requires2FA: true });
    expect((await doLogin({ email: admin.email, password: PASSWORD, totp: generateTOTP(secret) })).status).toBe(200);
    expect((await doLogin({ email: admin.email, password: PASSWORD, totp: backupCodes[0] })).status).toBe(200);
    expect((await doLogin({ email: admin.email, password: PASSWORD, totp: backupCodes[0] })).status).toBe(401);
  });

  it('disabling 2FA requires the password and a valid code', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const admin = await createAdmin({ twoFactorEnabled: true, twoFactorSecret: secret, twoFactorBackupCodes: [] });
    const token = tokenFor(admin);
    const disable = (body: unknown) =>
      disable2fa(makeRequest('/api/admin/2fa/disable', { method: 'POST', token, body })).then((r) => r.status);

    expect(await disable({ password: 'wrong', code: generateTOTP(secret) })).toBe(401);
    expect(await disable({ password: PASSWORD, code: '000000' })).toBe(401);
    expect((await User.findById(admin._id).lean())!.twoFactorEnabled).toBe(true);

    expect(await disable({ password: PASSWORD, code: generateTOTP(secret) })).toBe(200);
    expect((await User.findById(admin._id).lean())!.twoFactorEnabled).toBe(false);
    expect((await doLogin({ email: admin.email, password: PASSWORD })).body?.token).toBeTruthy();
  });

  it('2FA management endpoints reject non-admins', async () => {
    const user = await createUser();
    const token = tokenFor(user);
    expect((await setup2fa(makeRequest('/api/admin/2fa/setup', { token }))).status).toBe(403);
    expect((await verify2fa(makeRequest('/x', { method: 'POST', token, body: { code: '1' } }))).status).toBe(403);
    expect((await disable2fa(makeRequest('/x', { method: 'POST', token, body: {} }))).status).toBe(403);
  });
});
