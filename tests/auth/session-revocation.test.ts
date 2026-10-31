import { describe, expect, it, vi } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as refresh } from '@/app/api/auth/refresh/route';
import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as resetPassword } from '@/app/api/auth/reset-password/route';
import { DELETE as deleteUser, PATCH as patchUser } from '@/app/api/admin/users/[id]/route';
import { GET as me } from '@/app/api/admin/me/route';
import { sendPasswordResetMail } from '@/server/mailer';
import RefreshToken from '@/server/models/RefreshToken';
import { PASSWORD, createAdmin, createUser, ctx, freshIp, makeRequest, read, tokenFor } from '../helpers';

const NEW_PASSWORD = 'Brand-New-Passw0rd';

async function loginAs(email: string, password = PASSWORD) {
  const r = await read(await login(makeRequest('/api/auth/login', { method: 'POST', body: { email, password }, ip: freshIp() })));
  return { status: r.status, token: r.body?.token as string, refreshToken: r.body?.refreshToken as string };
}
const meStatus = async (token: string) => (await me(makeRequest('/api/admin/me', { token }))).status;
const refreshStatus = async (refreshToken: string) =>
  (await refresh(makeRequest('/api/auth/refresh', { method: 'POST', body: { refreshToken } }))).status;

/** An acting super-admin plus a target admin with a live session. */
async function scenario() {
  const actor = await createAdmin();
  const target = await createAdmin();
  const session = await loginAs(target.email);
  expect(await meStatus(session.token)).toBe(200);
  const patch = (body: unknown, id = target._id.toString()) =>
    patchUser(makeRequest(`/api/admin/users/${id}`, { method: 'PATCH', token: tokenFor(actor), body }), ctx({ id }));
  return { actor, target, session, patch };
}

describe('admin account changes end existing sessions', () => {
  it('demoting an admin revokes their access and refresh tokens immediately', async () => {
    const { target, session, patch } = await scenario();
    expect((await patch({ role: 'user' })).status).toBe(200);

    expect([401, 403]).toContain(await meStatus(session.token));
    expect(await refreshStatus(session.refreshToken)).toBe(401);
    expect(await RefreshToken.countDocuments({ userId: target._id })).toBe(0);
  });

  it('re-promoting a demoted admin does not resurrect pre-demotion tokens', async () => {
    const { session, patch } = await scenario();
    await patch({ role: 'user' });
    await patch({ role: 'admin' });
    expect(await meStatus(session.token)).toBe(401);
  });

  it('disabling an admin revokes access and refresh tokens and blocks login', async () => {
    const { target, session, patch } = await scenario();
    expect((await patch({ isActive: false })).status).toBe(200);

    expect(await meStatus(session.token)).toBe(401);
    expect(await refreshStatus(session.refreshToken)).toBe(401);
    expect((await loginAs(target.email)).status).toBe(403);
  });

  it('re-enabling a disabled admin does not resurrect pre-disable tokens, but fresh logins work', async () => {
    const { target, session, patch } = await scenario();
    await patch({ isActive: false });
    await patch({ isActive: true });

    expect(await meStatus(session.token)).toBe(401);
    expect(await refreshStatus(session.refreshToken)).toBe(401);
    const fresh = await loginAs(target.email);
    expect(await meStatus(fresh.token)).toBe(200);
  });

  it('an admin-set password change revokes all of that user\'s sessions', async () => {
    const { target, session, patch } = await scenario();
    const second = await loginAs(target.email);
    expect((await patch({ password: NEW_PASSWORD })).status).toBe(200);

    expect(await meStatus(session.token)).toBe(401);
    expect(await meStatus(second.token)).toBe(401);
    expect(await refreshStatus(second.refreshToken)).toBe(401);
    expect((await loginAs(target.email)).status).toBe(401);
    expect((await loginAs(target.email, NEW_PASSWORD)).status).toBe(200);
  });

  it('deleting an admin revokes access and refresh tokens', async () => {
    const { actor, target, session } = await scenario();
    const id = target._id.toString();
    const res = await deleteUser(makeRequest(`/api/admin/users/${id}`, { method: 'DELETE', token: tokenFor(actor) }), ctx({ id }));
    expect(res.status).toBe(200);

    expect(await meStatus(session.token)).toBe(401);
    expect(await refreshStatus(session.refreshToken)).toBe(401);
    expect(await RefreshToken.countDocuments({ userId: target._id })).toBe(0);
  });

  it('harmless edits (name/phone) and promotions do not log anyone out', async () => {
    const { session, patch } = await scenario();
    expect((await patch({ name: 'Renamed', phone: '123' })).status).toBe(200);
    expect((await patch({ role: 'admin' })).status).toBe(200);
    expect(await meStatus(session.token)).toBe(200);
    expect(await refreshStatus(session.refreshToken)).toBe(200);
  });

  it('revocation is per-user: other admins keep their sessions', async () => {
    const { actor, patch } = await scenario();
    const bystander = await loginAs(actor.email);
    await patch({ isActive: false });
    expect(await meStatus(bystander.token)).toBe(200);
  });

  it('an admin cannot disable or delete their own account', async () => {
    const { actor, patch } = await scenario();
    const self = actor._id.toString();
    expect((await patch({ isActive: false }, self)).status).toBe(400);
    const del = await deleteUser(makeRequest('/x', { method: 'DELETE', token: tokenFor(actor) }), ctx({ id: self }));
    expect(del.status).toBe(400);
  });

  it('a normal user cannot change roles or disable admins', async () => {
    const user = await createUser();
    const victim = await createAdmin();
    const id = victim._id.toString();
    const res = await patchUser(
      makeRequest(`/api/admin/users/${id}`, { method: 'PATCH', token: tokenFor(user), body: { isActive: false } }),
      ctx({ id })
    );
    expect(res.status).toBe(403);
  });
});

describe('forgot-password → reset-password flow', () => {
  async function requestReset(email: string) {
    vi.mocked(sendPasswordResetMail).mockClear();
    const res = await forgotPassword(makeRequest('/api/auth/forgot-password', { method: 'POST', body: { email }, ip: freshIp() }));
    expect(res.status).toBe(200);
    const call = vi.mocked(sendPasswordResetMail).mock.calls[0];
    return call ? new URL(call[1]).searchParams.get('token')! : null;
  }
  const reset = (token: string, password = NEW_PASSWORD) =>
    resetPassword(makeRequest('/api/auth/reset-password', { method: 'POST', body: { token, password }, ip: freshIp() }));

  it('resetting the password invalidates every existing access and refresh token', async () => {
    const admin = await createAdmin();
    const s1 = await loginAs(admin.email);
    const s2 = await loginAs(admin.email);

    const token = await requestReset(admin.email);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect((await reset(token!)).status).toBe(200);

    for (const s of [s1, s2]) {
      expect(await meStatus(s.token)).toBe(401);
      expect(await refreshStatus(s.refreshToken)).toBe(401);
    }
    expect((await loginAs(admin.email)).status).toBe(401);
    expect((await loginAs(admin.email, NEW_PASSWORD)).status).toBe(200);
  });

  it('a reset token is single-use', async () => {
    const admin = await createAdmin();
    const token = await requestReset(admin.email);
    expect((await reset(token!)).status).toBe(200);
    expect((await reset(token!, 'Another-Passw0rd')).status).toBe(400);
  });

  it('does not reveal whether an email exists, and sends nothing for unknown/disabled accounts', async () => {
    const disabled = await createAdmin({ isActive: false });
    expect(await requestReset('nobody@test.local')).toBeNull();
    expect(await requestReset(disabled.email)).toBeNull();
  });

  it('rejects a bogus token and a too-short password', async () => {
    const admin = await createAdmin();
    expect((await reset('0'.repeat(64))).status).toBe(400);
    const token = await requestReset(admin.email);
    expect((await reset(token!, 'short')).status).toBe(400);
  });
});
