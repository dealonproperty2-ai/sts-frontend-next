import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import User from '@/server/models/User';
import { createAdmin, createUser, makeRequest, tokenFor } from '../helpers';

// Discover every admin route on disk so new routes are covered automatically.
const ADMIN_API = path.join(process.cwd(), 'src', 'app', 'api', 'admin');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

const routeFiles = (fs.readdirSync(ADMIN_API, { recursive: true }) as string[])
  .filter((f) => path.basename(f) === 'route.ts')
  .map((f) => f.split(path.sep).join('/'))
  .sort();

const handlers: Array<{ name: string; urlPath: string; params: Record<string, string>; method: string; fn: Handler }> = [];
for (const rel of routeFiles) {
  const mod = (await import(/* @vite-ignore */ `/src/app/api/admin/${rel}`)) as Record<string, unknown>;
  const dir = path.posix.dirname(rel);
  const params = Object.fromEntries(
    [...dir.matchAll(/\[(\w+)\]/g)].map(([, p]) => [p, p === 'filename' ? 'probe.pdf' : new mongoose.Types.ObjectId().toString()])
  );
  const urlPath = `/api/admin/${dir.replace(/\[(\w+)\]/g, (_, p: string) => params[p])}`;
  for (const method of METHODS) {
    if (typeof mod[method] === 'function') {
      handlers.push({ name: `${method} /api/admin/${dir}`, urlPath, params, method, fn: mod[method] as Handler });
    }
  }
}

async function call(h: (typeof handlers)[number], token?: string) {
  const body = h.method === 'GET' || h.method === 'DELETE' ? undefined : { probe: true, isActive: false, role: 'admin' };
  const res = await h.fn(makeRequest(h.urlPath, { method: h.method, token, body }), { params: Promise.resolve(h.params) });
  return res.status;
}

/** Collections that a rejected request must never have written to. */
async function nonUserDocumentCount() {
  const collections = await mongoose.connection.db!.collections();
  const counts = await Promise.all(
    collections.filter((c) => !['users', 'refreshtokens'].includes(c.collectionName)).map((c) => c.countDocuments())
  );
  return counts.reduce((a, b) => a + b, 0);
}

describe('every admin API handler enforces admin authorization', () => {
  it('discovers the full admin surface (guards against a broken glob silently testing nothing)', () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(40);
    expect(handlers.length).toBeGreaterThanOrEqual(69);
  });

  it.each(handlers.map((h) => [h.name, h] as const))('%s', async (_name, h) => {
    const user = await createUser();
    const disabled = await createAdmin({ isActive: false });
    const demoted = await createAdmin();
    const demotedToken = tokenFor(demoted);
    await User.updateOne({ _id: demoted._id }, { role: 'user' });
    const revoked = await createAdmin();
    const revokedToken = tokenFor(revoked);
    await User.updateOne({ _id: revoked._id }, { $inc: { tokenVersion: 1 } });

    expect(await call(h), 'no token').toBe(401);
    expect(await call(h, 'garbage.token.value'), 'malformed token').toBe(401);
    expect(await call(h, tokenFor(user)), 'normal user').toBe(403);
    expect(await call(h, tokenFor(disabled)), 'disabled admin').toBe(401);
    expect(await call(h, demotedToken), 'demoted admin').toBe(403);
    expect(await call(h, revokedToken), 'revoked session').toBe(401);

    // Rejected requests must not have changed anything.
    expect(await nonUserDocumentCount()).toBe(0);
    expect(await User.countDocuments({ role: 'admin', isActive: true })).toBe(1); // only `revoked`
  });
});
