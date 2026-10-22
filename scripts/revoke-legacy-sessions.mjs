// One-time invalidation of every session issued before the Phase 1 auth fix
// (incl. any issued by the removed OTP login flow).
//
// DRY RUN (default, read-only):
//   node --env-file=<env file> scripts/revoke-legacy-sessions.mjs
// APPLY (requires typing the database name back):
//   node --env-file=<env file> scripts/revoke-legacy-sessions.mjs --apply --confirm-db=<dbName>
// Options:
//   --scope=all|admins   all (default, recommended) or only role=admin users
//   --drop-otps          also drop the obsolete `otps` collection (after forensics)
//   --manifest=<path>    where to write the non-sensitive run manifest
//
// Run only AFTER the new code is deployed: old code ignores tokenVersion and
// would keep issuing sessions. Never prints the connection string, refresh
// tokens or OTP values.

import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

/** Grace period to catch a refresh that was in flight during the bump. */
export const IN_FLIGHT_GRACE_MS = 10_000;

/**
 * @param {import('mongodb').Db} db
 * @param {{ scope?: 'all'|'admins', apply?: boolean, dropOtps?: boolean, graceMs?: number, log?: (s: string) => void }} opts
 */
export async function revokeLegacySessions(db, opts = {}) {
  const { scope = 'all', apply = false, dropOtps = false, graceMs = IN_FLIGHT_GRACE_MS, log = console.log } = opts;
  if (!['all', 'admins'].includes(scope)) throw new Error(`invalid scope: ${scope}`);

  const users = db.collection('users');
  const refreshTokens = db.collection('refreshtokens');
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);

  // ── Read-only inventory / forensics ───────────────────────────────────────
  const admins = await users.find({ role: 'admin' }, { projection: { email: 1, isActive: 1, tokenVersion: 1 } }).toArray();
  const adminIds = admins.map((a) => a._id);
  const report = {
    scope,
    apply,
    users: { total: await users.countDocuments(), admins: admins.length, activeAdmins: admins.filter((a) => a.isActive !== false).length },
    refreshTokens: {
      total: await refreshTokens.countDocuments(),
      admin: await refreshTokens.countDocuments({ userId: { $in: adminIds } }),
      // Only the removed verify-otp route ever stored userId: null — any of
      // these prove the OTP endpoint was used.
      orphanedOtpIssued: await refreshTokens.countDocuments({ userId: null }),
    },
    otps: { collectionExists: collections.includes('otps'), docs: 0, adminTargets: 0 },
    changes: { usersBumped: 0, refreshTokensDeleted: 0, otpsDropped: false },
  };
  report.refreshTokens.nonAdmin = report.refreshTokens.total - report.refreshTokens.admin - report.refreshTokens.orphanedOtpIssued;
  if (report.otps.collectionExists) {
    const otps = db.collection('otps');
    report.otps.docs = await otps.countDocuments();
    // OTP requests that targeted an admin mailbox (values are never read out).
    report.otps.adminTargets = await otps.countDocuments({ target: { $in: admins.map((a) => a.email) } });
  }

  log(`[inventory] users=${report.users.total} admins=${report.users.admins} (active ${report.users.activeAdmins})`);
  log(`[inventory] refresh tokens: total=${report.refreshTokens.total} admin=${report.refreshTokens.admin} ` +
      `nonAdmin=${report.refreshTokens.nonAdmin} otpIssued(userId=null)=${report.refreshTokens.orphanedOtpIssued}`);
  log(`[inventory] otps collection: ${report.otps.collectionExists ? `${report.otps.docs} docs, ${report.otps.adminTargets} targeting admin emails` : 'absent'}`);

  if (!apply) {
    const n = scope === 'all' ? report.users.total : report.users.admins;
    log(`[dry-run] would bump tokenVersion for ${n} user(s) and delete ` +
        `${scope === 'all' ? report.refreshTokens.total : report.refreshTokens.admin + report.refreshTokens.orphanedOtpIssued} refresh token(s). No changes made.`);
    return report;
  }

  // ── Apply ──────────────────────────────────────────────────────────────────
  const userFilter = scope === 'all' ? {} : { role: 'admin' };
  const tokenFilter = scope === 'all' ? {} : { $or: [{ userId: { $in: adminIds } }, { userId: null }] };

  // 1. Kill refresh tokens so no new access token can be minted from them.
  let deleted = (await refreshTokens.deleteMany(tokenFilter)).deletedCount;
  // 2. Bump versions: every outstanding access token (with or without tv) dies.
  report.changes.usersBumped = (await users.updateMany(userFilter, { $inc: { tokenVersion: 1 } })).modifiedCount;
  // 3. A refresh that consumed its token just before step 1 may have stored a
  //    replacement after it. Sweep again after a grace period. Anything created
  //    up to now is pre-bump or racing; legitimate users simply log in again.
  if (graceMs > 0) await new Promise((r) => setTimeout(r, graceMs));
  const sweepFilter = scope === 'all'
    ? { createdAt: { $lte: new Date() } }
    : { $and: [tokenFilter, { createdAt: { $lte: new Date() } }] };
  deleted += (await refreshTokens.deleteMany(sweepFilter)).deletedCount;
  report.changes.refreshTokensDeleted = deleted;

  if (dropOtps && report.otps.collectionExists) {
    await db.collection('otps').drop();
    report.changes.otpsDropped = true;
  }

  log(`[apply] bumped tokenVersion on ${report.changes.usersBumped} user(s); deleted ${deleted} refresh token(s)` +
      `${report.changes.otpsDropped ? '; dropped otps collection' : ''}.`);
  return report;
}

/**
 * Resolves the manifest path and proves it is writable BEFORE any database
 * work, so a bad path can never leave an applied revocation without a record.
 * On Windows a POSIX-style path ("/tmp/x", "/c/Users/x") is rejected: Git Bash
 * normally rewrites it, but with MSYS_NO_PATHCONV=1 (or from cmd/PowerShell)
 * Node would silently resolve it against the current drive root.
 * Refuses to overwrite an existing file.
 * @param {unknown} arg value of --manifest (string), true (flag without value) or undefined
 */
export function prepareManifestPath(arg, { platform = process.platform, now = new Date(), tmpdir = os.tmpdir() } = {}) {
  let target;
  if (arg === true || arg === '') {
    throw new Error('--manifest requires a value, e.g. --manifest=C:/secure/revoke.json');
  } else if (typeof arg === 'string') {
    if (platform === 'win32' && /^\/(?!\/)/.test(arg)) {
      throw new Error(
        '--manifest looks like a POSIX path. On Windows pass a drive path (e.g. C:/secure/revoke.json) ' +
          'or omit --manifest to use the system temp directory.'
      );
    }
    target = path.resolve(arg);
  } else {
    target = path.join(tmpdir, `revoke-legacy-sessions-${now.toISOString().replace(/[:.]/g, '-')}.json`);
  }
  writeFileSync(target, JSON.stringify({ status: 'pending', at: now.toISOString() }, null, 2), { flag: 'wx', mode: 0o600 });
  return target;
}

function writeManifest(target, data) {
  writeFileSync(target, JSON.stringify({ at: new Date().toISOString(), ...data }, null, 2), { mode: 0o600 });
}

// ── CLI ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, ...v] = a.replace(/^--/, '').split('=');
      return [k, v.length ? v.join('=') : true];
    })
  );
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set (pass --env-file=<file>).');
    process.exit(1);
  }

  // Pre-flight the manifest before connecting — nothing touches the DB if this fails.
  const manifest = prepareManifestPath(args.manifest);
  console.log(`[manifest] ${manifest}`);

  const require = createRequire(import.meta.url);
  const mongoose = require('mongoose');
  let database = null;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
    const db = mongoose.connection.db;
    database = db.databaseName;
    const isSrv = uri.startsWith('mongodb+srv:');
    console.log(`[target] database="${database}" (${isSrv ? 'SRV / likely Atlas' : 'standard URI'})`);

    const apply = args.apply === true;
    if (apply && args['confirm-db'] !== database) {
      console.error(`Refusing to apply: pass --confirm-db=${database} to confirm the target database.`);
      writeManifest(manifest, { status: 'refused', database, reason: 'confirm-db mismatch' });
      process.exitCode = 2;
      return;
    }
    const report = await revokeLegacySessions(db, {
      scope: args.scope ?? 'all',
      apply,
      dropOtps: args['drop-otps'] === true,
    });
    writeManifest(manifest, { status: apply ? 'applied' : 'dry-run', database, ...report });
  } catch (err) {
    writeManifest(manifest, { status: 'failed', database, error: String(err?.message ?? err) });
    throw err;
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[error]', err?.message ?? err);
    process.exit(1);
  });
}
