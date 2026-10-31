import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as refresh } from '@/app/api/auth/refresh/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { verifyAdmin } from '@/server/adminAuth';
import { audit } from '@/server/audit';
import RefreshToken from '@/server/models/RefreshToken';
import User from '@/server/models/User';
import { PASSWORD, createAdmin, freshIp, makeRequest, read } from '../helpers';

async function loginAs(email: string) {
  const { body } = await read(await login(makeRequest('/api/auth/login', { method: 'POST', body: { email, password: PASSWORD }, ip: freshIp() })));
  return { token: body!.token as string, refreshToken: body!.refreshToken as string };
}
const doRefresh = (refreshToken: unknown) =>
  refresh(makeRequest('/api/auth/refresh', { method: 'POST', body: { refreshToken } })).then(read);
const isAdmin = async (token: string) => !('error' in (await verifyAdmin(makeRequest('/x', { token }))));

describe('POST /api/auth/refresh — rotation', () => {
  it('exchanges a refresh token for a new access token and a new refresh token', async () => {
    const admin = await createAdmin();
    const s = await loginAs(admin.email);

    const { status, body } = await doRefresh(s.refreshToken);
    expect(status).toBe(200);
    expect(body!.refreshToken).not.toBe(s.refreshToken);
    expect(await isAdmin(body!.token as string)).toBe(true);
    expect(jwt.decode(body!.token as string)).toMatchObject({ id: admin._id.toString(), tv: 0 });
  });

  it('rejects reuse of a refresh token that has already been rotated (401)', async () => {
    const admin = await createAdmin();
    const s = await loginAs(admin.email);
    expect((await doRefresh(s.refreshToken)).status).toBe(200);
    expect((await doRefresh(s.refreshToken)).status).toBe(401);
  });

  it('lets exactly one of several concurrent uses of the same refresh token succeed', async () => {
    const admin = await createAdmin();
    const s = await loginAs(admin.email);
    const results = await Promise.all(Array.from({ length: 5 }, () => doRefresh(s.refreshToken)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 401)).toHaveLength(4);
    expect(await RefreshToken.countDocuments({ userId: admin._id })).toBe(1);
  });

  it('chains: each rotated token works once', async () => {
    const admin = await createAdmin();
    let rt = (await loginAs(admin.email)).refreshToken;
    for (let i = 0; i < 3; i++) {
      const r = await doRefresh(rt);
      expect(r.status).toBe(200);
      rt = r.body!.refreshToken as string;
    }
  });

  it('rejects an expired refresh token (401)', async () => {
    const admin = await createAdmin();
    const s = await loginAs(admin.email);
    await RefreshToken.updateOne({ token: s.refreshToken }, { expiresAt: new Date(Date.now() - 1000) });
    expect((await doRefresh(s.refreshToken)).status).toBe(401);
  });

  it('rejects an unknown refresh token (401) and malformed input (400)', async () => {
    expect((await doRefresh('f'.repeat(96))).status).toBe(401);
    expect((await doRefresh(undefined)).status).toBe(400);
    expect((await doRefresh({ $ne: null })).status).toBe(400);
  });

  it('will not refresh a disabled account', async () => {
    const admin = await createAdmin();
    const s = await loginAs(admin.email);
    await User.updateOne({ _id: admin._id }, { isActive: false });
    expect((await doRefresh(s.refreshToken)).status).toBe(401);
  });

  it('a refreshed token for a since-demoted user carries no admin access', async () => {
    const admin = await createAdmin();
    const s = await loginAs(admin.email);
    await User.updateOne({ _id: admin._id }, { role: 'user' }); // direct DB change, no revocation
    const r = await doRefresh(s.refreshToken);
    // Refresh itself still works for an active account; the new token just isn't admin.
    expect(r.status).toBe(200);
    expect(jwt.decode(r.body!.token as string)).toMatchObject({ role: 'user' });
    expect(await isAdmin(r.body!.token as string)).toBe(false);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the supplied refresh token and audits the logout', async () => {
    const admin = await createAdmin();
    const s = await loginAs(admin.email);
    const res = await logout(makeRequest('/api/auth/logout', { method: 'POST', token: s.token, body: { refreshToken: s.refreshToken } }));
    expect(res.status).toBe(200);
    expect((await doRefresh(s.refreshToken)).status).toBe(401);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGOUT', adminId: admin._id.toString() }));
  });

  it('only revokes the session being logged out', async () => {
    const admin = await createAdmin();
    const a = await loginAs(admin.email);
    const b = await loginAs(admin.email);
    await logout(makeRequest('/api/auth/logout', { method: 'POST', token: a.token, body: { refreshToken: a.refreshToken } }));
    expect((await doRefresh(b.refreshToken)).status).toBe(200);
  });

  it('succeeds without an access token or body (idempotent)', async () => {
    expect((await logout(makeRequest('/api/auth/logout', { method: 'POST' }))).status).toBe(200);
    expect((await logout(makeRequest('/api/auth/logout', { method: 'POST', body: { refreshToken: 'nope' } }))).status).toBe(200);
  });
});
