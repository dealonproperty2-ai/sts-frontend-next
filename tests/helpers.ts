import bcrypt from 'bcryptjs';
import { connectDb } from '@/server/db';
import { signAccessToken } from '@/server/adminAuth';
import User from '@/server/models/User';

/** Used only by the test process — set by tests/setup/per-file.ts. */
export const TEST_JWT_SECRET = 'vitest-only-jwt-secret-0123456789abcdef-not-a-real-key';
export const PASSWORD = 'Correct-Horse-Battery-9';
export const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

let seq = 0;

export interface UserOverrides {
  email?: string;
  role?: string;
  isActive?: boolean;
  tokenVersion?: number;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
}

export async function createUser(over: UserOverrides = {}) {
  await connectDb();
  seq += 1;
  return User.create({
    email: `user${seq}@test.local`,
    name: `Test User ${seq}`,
    password: await bcrypt.hash(PASSWORD, 4), // low cost keeps tests fast
    role: 'user',
    ...over,
  });
}

export const createAdmin = (over: UserOverrides = {}) => createUser({ role: 'admin', ...over });

/** An access token minted exactly as the login/refresh routes mint them. */
export function tokenFor(user: Parameters<typeof signAccessToken>[0]) {
  return signAccessToken(user, TEST_JWT_SECRET);
}

let ipSeq = 0;
/** A distinct client IP, so per-IP rate limits never couple unrelated tests. */
export const freshIp = () => `198.51.100.${(ipSeq = (ipSeq % 250) + 1)}`;

export function makeRequest(
  path: string,
  opts: { method?: string; body?: unknown; token?: string; ip?: string; headers?: Record<string, string> } = {}
) {
  const { method = 'GET', body, token, ip = '203.0.113.10', headers = {} } = opts;
  return new Request(`http://test.local${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'x-forwarded-for': ip,
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

export async function read(res: Response) {
  const text = await res.text();
  let body: Record<string, unknown> | null = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  return { status: res.status, body };
}

/** Route-handler context as Next 15 passes it: params is a Promise. */
export const ctx = <P extends Record<string, string>>(params: P) => ({ params: Promise.resolve(params) });
