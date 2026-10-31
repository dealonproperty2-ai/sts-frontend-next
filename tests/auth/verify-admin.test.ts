import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { revokeUserSessions, verifyAdmin } from '@/server/adminAuth';
import User from '@/server/models/User';
import { TEST_JWT_SECRET, createAdmin, createUser, makeRequest, tokenFor } from '../helpers';

async function check(authorization?: string) {
  const req = makeRequest('/api/admin/me', { headers: authorization ? { authorization } : {} });
  const result = await verifyAdmin(req);
  if ('error' in result) return { ok: false as const, status: result.error.status };
  return { ok: true as const, payload: result.payload };
}
const bearer = (t: string) => `Bearer ${t}`;
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const newId = () => new mongoose.Types.ObjectId().toString();

describe('verifyAdmin — token validation', () => {
  it('rejects a request with no Authorization header (401)', async () => {
    expect(await check()).toEqual({ ok: false, status: 401 });
  });

  it('rejects non-Bearer schemes and empty bearer tokens (401)', async () => {
    const admin = await createAdmin();
    expect((await check(`Basic ${tokenFor(admin)}`)).status).toBe(401);
    expect((await check('Bearer ')).status).toBe(401);
  });

  it.each(['not-a-jwt', 'a.b.c', 'Bearer', '...', 'eyJhbGciOiJIUzI1NiJ9.e30'])(
    'rejects malformed token %j (401)',
    async (token) => {
      expect(await check(bearer(token))).toEqual({ ok: false, status: 401 });
    }
  );

  it('rejects an expired token even for a valid admin (401)', async () => {
    const admin = await createAdmin();
    const expired = jwt.sign(
      { id: admin._id.toString(), role: 'admin', tv: 0, exp: Math.floor(Date.now() / 1000) - 5 },
      TEST_JWT_SECRET
    );
    expect(await check(bearer(expired))).toEqual({ ok: false, status: 401 });
  });

  it('rejects a token signed with a different secret (401)', async () => {
    const admin = await createAdmin();
    const forged = jwt.sign({ id: admin._id.toString(), role: 'admin', tv: 0 }, 'attacker-secret');
    expect(await check(bearer(forged))).toEqual({ ok: false, status: 401 });
  });

  it('rejects an unsigned alg=none token (401)', async () => {
    const admin = await createAdmin();
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id: admin._id.toString(), role: 'admin' })}.`;
    expect(await check(bearer(none))).toEqual({ ok: false, status: 401 });
  });

  it.each(['HS384', 'HS512'] as const)(
    'rejects %s even when signed with the real secret — only HS256 is accepted',
    async (algorithm) => {
      const admin = await createAdmin();
      const t = jwt.sign({ id: admin._id.toString(), role: 'admin', tv: 0 }, TEST_JWT_SECRET, { algorithm });
      expect(await check(bearer(t))).toEqual({ ok: false, status: 401 });
    }
  );

  it('rejects an RS256 token (asymmetric algorithms are not accepted)', async () => {
    const admin = await createAdmin();
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const t = jwt.sign({ id: admin._id.toString(), role: 'admin', tv: 0 }, privateKey, { algorithm: 'RS256' });
    expect(await check(bearer(t))).toEqual({ ok: false, status: 401 });
  });

  it.each([
    ['no id claim', { role: 'admin' }],
    ['non-ObjectId id', { id: 'admin', role: 'admin' }],
    ['object id (NoSQL-injection shape)', { id: { $ne: null }, role: 'admin' }],
  ])('rejects a validly signed token with %s (401)', async (_label, claims) => {
    await createAdmin();
    expect(await check(bearer(jwt.sign(claims, TEST_JWT_SECRET)))).toEqual({ ok: false, status: 401 });
  });

  it('rejects a validly signed token for a user that does not exist (401)', async () => {
    const t = jwt.sign({ id: newId(), role: 'admin', tv: 0 }, TEST_JWT_SECRET);
    expect(await check(bearer(t))).toEqual({ ok: false, status: 401 });
  });

  it('fails closed with 503 when the user lookup errors (never falls back to the token)', async () => {
    const admin = await createAdmin();
    const t = tokenFor(admin);
    const spy = vi.spyOn(User, 'findById').mockImplementationOnce(() => {
      throw new Error('db down');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(await check(bearer(t))).toEqual({ ok: false, status: 503 });
    } finally {
      spy.mockRestore();
      errSpy.mockRestore();
    }
  });

  describe('when JWT_SECRET is missing', () => {
    const saved = process.env.JWT_SECRET;
    afterEach(() => { process.env.JWT_SECRET = saved; });

    it('fails closed with 500 rather than accepting tokens', async () => {
      const admin = await createAdmin();
      const t = tokenFor(admin);
      delete process.env.JWT_SECRET;
      expect(await check(bearer(t))).toEqual({ ok: false, status: 500 });
    });
  });
});

describe('verifyAdmin — authorization comes from the database, not the token', () => {
  it('accepts a current, active admin and returns the authoritative identity', async () => {
    const admin = await createAdmin({ email: 'boss@test.local' });
    const result = await check(bearer(tokenFor(admin)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toMatchObject({ id: admin._id.toString(), role: 'admin', email: 'boss@test.local' });
    }
  });

  it('forbids a normal user (403)', async () => {
    const user = await createUser();
    expect(await check(bearer(tokenFor(user)))).toEqual({ ok: false, status: 403 });
  });

  it('forbids a normal user holding a forged role:admin claim signed with the real secret (403)', async () => {
    const user = await createUser();
    const t = jwt.sign({ id: user._id.toString(), role: 'admin', tv: 0 }, TEST_JWT_SECRET);
    expect(await check(bearer(t))).toEqual({ ok: false, status: 403 });
  });

  it('rejects a disabled admin immediately (401)', async () => {
    const admin = await createAdmin();
    const t = tokenFor(admin);
    await User.updateOne({ _id: admin._id }, { isActive: false });
    expect(await check(bearer(t))).toEqual({ ok: false, status: 401 });
  });

  it('rejects a demoted admin immediately, even without a session bump', async () => {
    const admin = await createAdmin();
    const t = tokenFor(admin);
    await User.updateOne({ _id: admin._id }, { role: 'user' });
    expect(await check(bearer(t))).toEqual({ ok: false, status: 403 });
  });

  it('rejects a deleted admin immediately (401)', async () => {
    const admin = await createAdmin();
    const t = tokenFor(admin);
    await User.deleteOne({ _id: admin._id });
    expect(await check(bearer(t))).toEqual({ ok: false, status: 401 });
  });

  it('rejects tokens whose tv claim does not match the current tokenVersion (401)', async () => {
    const admin = await createAdmin({ tokenVersion: 3 });
    const stale = jwt.sign({ id: admin._id.toString(), role: 'admin', tv: 2 }, TEST_JWT_SECRET);
    const future = jwt.sign({ id: admin._id.toString(), role: 'admin', tv: 4 }, TEST_JWT_SECRET);
    expect((await check(bearer(stale))).status).toBe(401);
    expect((await check(bearer(future))).status).toBe(401);
    expect((await check(bearer(tokenFor(admin)))).ok).toBe(true);
  });

  it('revokeUserSessions invalidates every outstanding access token for that user only', async () => {
    const victim = await createAdmin();
    const bystander = await createAdmin();
    const victimTok = tokenFor(victim);
    const bystanderTok = tokenFor(bystander);
    await revokeUserSessions(victim._id);
    expect((await check(bearer(victimTok))).status).toBe(401);
    expect((await check(bearer(bystanderTok))).ok).toBe(true);
  });
});

describe('verifyAdmin — legacy tokens without a tv claim (compatibility policy)', () => {
  // Policy: tokens issued before tokenVersion existed are treated as tv=0, so
  // sessions survive the deploy — but they die at the first revocation.
  const legacyToken = (id: string) =>
    jwt.sign({ id, email: 'x@test.local', role: 'admin' }, TEST_JWT_SECRET, { expiresIn: '1h' });

  it('accepts a legacy token while the user has never been revoked (tokenVersion 0)', async () => {
    const admin = await createAdmin();
    expect((await check(bearer(legacyToken(admin._id.toString())))).ok).toBe(true);
  });

  it('accepts a legacy token for a pre-existing user document with no tokenVersion field', async () => {
    const admin = await createAdmin();
    await User.collection.updateOne({ _id: admin._id }, { $unset: { tokenVersion: '' } });
    expect((await check(bearer(legacyToken(admin._id.toString())))).ok).toBe(true);
  });

  it('rejects a legacy token once the user has been revoked', async () => {
    const admin = await createAdmin();
    const t = legacyToken(admin._id.toString());
    await revokeUserSessions(admin._id);
    expect(await check(bearer(t))).toEqual({ ok: false, status: 401 });
  });

  it('still applies the database role/status checks to legacy tokens', async () => {
    const user = await createUser();
    expect((await check(bearer(legacyToken(user._id.toString())))).status).toBe(403);
  });
});
