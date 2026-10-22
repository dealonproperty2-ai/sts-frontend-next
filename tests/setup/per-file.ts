import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { afterAll, beforeEach, inject, vi } from 'vitest';
import { assertTestMongoUri } from './safe-uri';
import { TEST_JWT_SECRET } from '../helpers';

// ── Side effects: no real email, no fire-and-forget audit writes racing teardown
vi.mock('@/server/mailer', () => ({
  getTransporter: vi.fn(() => null),
  sendEnquiryMails: vi.fn(async () => ({ sent: false })),
  sendApplicationMails: vi.fn(async () => ({ sent: false })),
  sendPasswordResetMail: vi.fn(async () => ({ sent: true })),
  send2FAEnabledMail: vi.fn(async () => ({ sent: true })),
  sendBillReminderMail: vi.fn(async () => ({ sent: false })),
}));
vi.mock('@/server/audit', () => ({ audit: vi.fn() }));

// ── Database isolation ──────────────────────────────────────────────────────
const memoryUri = inject('mongoUri');
assertTestMongoUri(memoryUri, memoryUri);

// Unique database per test file; overrides anything from the shell/.env files.
const dbUrl = new URL(memoryUri);
dbUrl.pathname = `/vitest_${randomBytes(6).toString('hex')}`;
process.env.MONGODB_URI = dbUrl.toString();
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.SITE_URL = 'http://test.local';
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

// Hard stop: any connection attempt to a non-test URI throws before dialing.
const realConnect = mongoose.connect.bind(mongoose);
vi.spyOn(mongoose, 'connect').mockImplementation(((uri: string, options?: mongoose.ConnectOptions) => {
  assertTestMongoUri(uri, memoryUri);
  return realConnect(uri, options);
}) as typeof mongoose.connect);

type Globals = { __mongooseConn?: unknown; __rateStore?: Map<string, unknown> };
const g = globalThis as Globals;
g.__mongooseConn = undefined; // never reuse a cached connection from elsewhere

beforeEach(async () => {
  g.__rateStore?.clear();
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  }
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  } finally {
    await mongoose.disconnect();
    g.__mongooseConn = undefined;
    g.__rateStore?.clear();
  }
});
