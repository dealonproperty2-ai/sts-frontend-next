import { randomBytes } from 'crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prepareManifestPath, revokeLegacySessions } from '../../scripts/revoke-legacy-sessions.mjs';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as refresh } from '@/app/api/auth/refresh/route';
import { verifyAdmin } from '@/server/adminAuth';
import { connectDb } from '@/server/db';
import RefreshToken from '@/server/models/RefreshToken';
import User from '@/server/models/User';
import { PASSWORD, TEST_JWT_SECRET, createAdmin, createUser, freshIp, makeRequest, read, tokenFor } from '../helpers';

const silent = () => {};
const adminStatus = async (token: string) => {
  const r = await verifyAdmin(makeRequest('/api/admin/me', { token }));
  return 'error' in r ? r.error.status : 200;
};
const doRefresh = (refreshToken: string) =>
  refresh(makeRequest('/api/auth/refresh', { method: 'POST', body: { refreshToken } })).then(read);

/** Exactly what the removed verify-otp route issued: { id, role }, no tv, 8h. */
const otpStyleAccessToken = (id: string, role: string) => jwt.sign({ id, role }, TEST_JWT_SECRET, { expiresIn: '8h' });
async function otpStyleRefreshToken(userId: mongoose.Types.ObjectId | null) {
  const token = randomBytes(48).toString('hex');
  await RefreshToken.create({ userId, token, expiresAt: new Date(Date.now() + 30 * 864e5) });
  return token;
}

/** Pre-deploy world: sessions from the OTP flow and from normal password logins. */
async function legacyWorld() {
  await connectDb();
  const admin = await createAdmin();
  const user = await createUser();
  const world = {
    admin,
    user,
    adminOtpAccess: otpStyleAccessToken(admin._id.toString(), 'admin'),
    adminOtpRefresh: await otpStyleRefreshToken(admin._id),
    adminLoginAccess: tokenFor(admin), // tv-bearing, minted by new code after deploy
    userOtpAccess: otpStyleAccessToken(user._id.toString(), 'user'),
    userOtpRefresh: await otpStyleRefreshToken(user._id),
    orphanRefresh: await otpStyleRefreshToken(null),
  };
  await mongoose.connection.db!.collection('otps').insertOne({
    target: admin.email, otp: '123456', purpose: 'login', expiresAt: new Date(Date.now() + 6e5),
  });
  // Sanity: before invalidation the legacy admin sessions really are live.
  expect(await adminStatus(world.adminOtpAccess)).toBe(200);
  expect(await adminStatus(world.adminLoginAccess)).toBe(200);
  return world;
}
const db = () => mongoose.connection.db!;

describe('revoke-legacy-sessions — dry run', () => {
  it('reports inventory and OTP forensics without changing anything', async () => {
    const w = await legacyWorld();
    const before = await RefreshToken.countDocuments();
    const report = await revokeLegacySessions(db(), { log: silent });

    expect(report.apply).toBe(false);
    expect(report.users).toMatchObject({ total: 2, admins: 1, activeAdmins: 1 });
    expect(report.refreshTokens).toMatchObject({ total: 3, admin: 1, nonAdmin: 1, orphanedOtpIssued: 1 });
    expect(report.otps).toEqual({ collectionExists: true, docs: 1, adminTargets: 1 });
    expect(report.changes).toEqual({ usersBumped: 0, refreshTokensDeleted: 0, otpsDropped: false });

    expect(await RefreshToken.countDocuments()).toBe(before);
    expect((await User.findById(w.admin._id).lean())!.tokenVersion).toBe(0);
    expect(await adminStatus(w.adminOtpAccess)).toBe(200);
  });

  it('never logs secrets (refresh tokens, OTP values)', async () => {
    const w = await legacyWorld();
    const lines: string[] = [];
    await revokeLegacySessions(db(), { log: (s) => lines.push(s) });
    await revokeLegacySessions(db(), { apply: true, graceMs: 0, log: (s) => lines.push(s) });
    const out = lines.join('\n');
    for (const secret of [w.adminOtpRefresh, w.userOtpRefresh, w.orphanRefresh, w.adminOtpAccess, '123456']) {
      expect(out).not.toContain(secret);
    }
  });
});

describe('revoke-legacy-sessions — apply, scope=all (recommended)', () => {
  it('rejects tv-less (OTP-issued) and pre-run tv-bearing admin access tokens', async () => {
    const w = await legacyWorld();
    await revokeLegacySessions(db(), { apply: true, graceMs: 0, log: silent });

    expect(await adminStatus(w.adminOtpAccess)).toBe(401);
    expect(await adminStatus(w.adminLoginAccess)).toBe(401);
    expect((await User.findById(w.admin._id).lean())!.tokenVersion).toBe(1);
  });

  it('kills every refresh token, so no new access token can be minted from an old session', async () => {
    const w = await legacyWorld();
    const report = await revokeLegacySessions(db(), { apply: true, graceMs: 0, log: silent });

    expect(report.changes.refreshTokensDeleted).toBe(3);
    expect(await RefreshToken.countDocuments()).toBe(0);
    for (const t of [w.adminOtpRefresh, w.userOtpRefresh, w.orphanRefresh]) {
      expect((await doRefresh(t)).status).toBe(401);
    }
  });

  it('closes the promotion gap: a normal user promoted later cannot use a pre-run session', async () => {
    const w = await legacyWorld();
    await revokeLegacySessions(db(), { apply: true, graceMs: 0, log: silent });
    await User.updateOne({ _id: w.user._id }, { role: 'admin' }); // promoted after the run

    expect(await adminStatus(w.userOtpAccess)).toBe(401);
    expect((await doRefresh(w.userOtpRefresh)).status).toBe(401);
  });

  it('legitimate users can log in again immediately and get working sessions', async () => {
    const w = await legacyWorld();
    await revokeLegacySessions(db(), { apply: true, graceMs: 0, log: silent });

    const res = await read(await login(makeRequest('/api/auth/login', {
      method: 'POST', body: { email: w.admin.email, password: PASSWORD }, ip: freshIp(),
    })));
    expect(res.status).toBe(200);
    expect(jwt.decode(res.body!.token as string)).toMatchObject({ tv: 1 });
    expect(await adminStatus(res.body!.token as string)).toBe(200);
    expect((await doRefresh(res.body!.refreshToken as string)).status).toBe(200);
  });

  it('sweeps a refresh token stored by a request racing the bump', async () => {
    const w = await legacyWorld();
    let racedToken = '';
    const run = revokeLegacySessions(db(), { apply: true, graceMs: 150, log: silent });
    // Simulates an in-flight refresh persisting its replacement mid-run.
    await new Promise((r) => setTimeout(r, 50));
    racedToken = await otpStyleRefreshToken(w.admin._id);
    await run;
    expect(await RefreshToken.countDocuments({ token: racedToken })).toBe(0);
  });

  it('optionally drops the obsolete otps collection', async () => {
    await legacyWorld();
    const report = await revokeLegacySessions(db(), { apply: true, dropOtps: true, graceMs: 0, log: silent });
    expect(report.changes.otpsDropped).toBe(true);
    const names = (await db().listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
    expect(names).not.toContain('otps');
  });

  it('handles user documents that predate the tokenVersion field', async () => {
    const w = await legacyWorld();
    await User.collection.updateOne({ _id: w.admin._id }, { $unset: { tokenVersion: '' } });
    expect(await adminStatus(w.adminOtpAccess)).toBe(200);
    await revokeLegacySessions(db(), { apply: true, graceMs: 0, log: silent });
    expect((await User.findById(w.admin._id).lean())!.tokenVersion).toBe(1);
    expect(await adminStatus(w.adminOtpAccess)).toBe(401);
  });
});

describe('revoke-legacy-sessions — scope=admins (documents why it is NOT recommended)', () => {
  it('invalidates current admins’ sessions…', async () => {
    const w = await legacyWorld();
    await revokeLegacySessions(db(), { apply: true, scope: 'admins', graceMs: 0, log: silent });
    expect(await adminStatus(w.adminOtpAccess)).toBe(401);
    expect((await doRefresh(w.adminOtpRefresh)).status).toBe(401);
    expect((await doRefresh(w.orphanRefresh)).status).toBe(401);
  });

  it('…but leaves a normal user’s OTP-issued refresh token alive, which yields admin access after a promotion', async () => {
    const w = await legacyWorld();
    await revokeLegacySessions(db(), { apply: true, scope: 'admins', graceMs: 0, log: silent });
    await User.updateOne({ _id: w.user._id }, { role: 'admin' });

    const r = await doRefresh(w.userOtpRefresh);
    expect(r.status).toBe(200); // the residual gap
    expect(await adminStatus(r.body!.token as string)).toBe(200);
  });
});

describe('prepareManifestPath — pre-flight before any database work', () => {
  let dir = '';
  beforeEach(() => { dir = mkdtempSync(path.join(os.tmpdir(), 'revoke-manifest-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('resolves a relative/drive path to an absolute file and creates it as pending', () => {
    const target = prepareManifestPath(path.join(dir, 'm.json'));
    expect(path.isAbsolute(target)).toBe(true);
    expect(JSON.parse(readFileSync(target, 'utf8'))).toMatchObject({ status: 'pending' });
  });

  it('defaults to a timestamped file in the temp directory', () => {
    const target = prepareManifestPath(undefined, { tmpdir: dir, now: new Date('2026-10-19T10:00:00Z') });
    expect(target).toBe(path.join(dir, 'revoke-legacy-sessions-2026-10-19T10-00-00-000Z.json'));
    expect(existsSync(target)).toBe(true);
  });

  it.each(['/tmp/revoke.json', '/c/Users/ops/revoke.json'])(
    'on Windows rejects POSIX-style path %j (Git Bash with path conversion off) instead of writing to the drive root',
    (p) => {
      expect(() => prepareManifestPath(p, { platform: 'win32' })).toThrow(/POSIX path/);
    }
  );

  it('on POSIX platforms accepts absolute paths', () => {
    // Exercised with a real directory so the write succeeds on any OS running the suite.
    expect(() => prepareManifestPath(path.join(dir, 'p.json'), { platform: 'linux' })).not.toThrow();
  });

  it('throws when the directory does not exist — before the DB would be touched', () => {
    expect(() => prepareManifestPath(path.join(dir, 'missing', 'm.json'))).toThrow();
  });

  it('refuses to overwrite an existing manifest', () => {
    const target = path.join(dir, 'm.json');
    writeFileSync(target, 'previous run');
    expect(() => prepareManifestPath(target)).toThrow();
    expect(readFileSync(target, 'utf8')).toBe('previous run');
  });

  it('rejects a bare --manifest flag with no value', () => {
    expect(() => prepareManifestPath(true)).toThrow(/requires a value/);
    expect(() => prepareManifestPath('')).toThrow(/requires a value/);
  });
});

it('rejects an unknown scope', async () => {
  await connectDb();
  await expect(revokeLegacySessions(db(), { scope: 'everyone' as 'all', log: silent })).rejects.toThrow(/invalid scope/);
});
