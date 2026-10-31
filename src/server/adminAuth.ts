import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import type { Types } from 'mongoose';
import { connectDb } from '@/server/db';
import User from '@/server/models/User';
import RefreshToken from '@/server/models/RefreshToken';

export interface AdminTokenPayload {
  id: string;
  email?: string;
  role: string;
  /** Session version — must match User.tokenVersion (missing on legacy tokens = 0). */
  tv?: number;
  iat?: number;
  exp?: number;
}

export const ACCESS_TOKEN_TTL = '8h';

/** Signs an access token bound to the user's current session version. */
export function signAccessToken(
  user: { _id: Types.ObjectId | string; email: string; role: string; tokenVersion?: number | null },
  secret: string
): string {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, tv: user.tokenVersion ?? 0 },
    secret,
    { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL }
  );
}

/**
 * Invalidates every session for a user: bumps tokenVersion so outstanding
 * access tokens fail verifyAdmin, and deletes all refresh tokens.
 */
export async function revokeUserSessions(userId: Types.ObjectId | string): Promise<void> {
  await connectDb();
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  await RefreshToken.deleteMany({ userId });
}

/**
 * Verifies the bearer token AND the user's current state in the database, so a
 * disabled, demoted, deleted or session-revoked admin is rejected immediately
 * rather than when their token expires.
 */
export async function verifyAdmin(
  req: Request
): Promise<{ payload: AdminTokenPayload } | { error: NextResponse }> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return { error: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }) };
  }

  let payload: AdminTokenPayload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as AdminTokenPayload;
  } catch {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  if (!payload || typeof payload.id !== 'string' || !/^[a-f0-9]{24}$/i.test(payload.id)) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  let user: { email: string; role: string; isActive: boolean; tokenVersion?: number | null } | null;
  try {
    await connectDb();
    user = await User.findById(payload.id).select('email role isActive tokenVersion').lean();
  } catch (err) {
    console.error('[adminAuth] db error', err);
    return { error: NextResponse.json({ error: 'Service unavailable' }, { status: 503 }) };
  }

  if (!user || !user.isActive || (payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }
  if (user.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  // Report the authoritative identity, not whatever the token claimed.
  return { payload: { ...payload, email: user.email, role: user.role } };
}
