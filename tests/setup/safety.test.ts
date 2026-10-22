import mongoose from 'mongoose';
import { describe, expect, inject, it } from 'vitest';
import { assertTestMongoUri } from './safe-uri';

const memoryUri = inject('mongoUri');
const port = new URL(memoryUri).port;

describe('test database isolation', () => {
  it('the app under test is pointed at the in-memory server, in its own database', () => {
    const appUri = new URL(process.env.MONGODB_URI!);
    expect(appUri.hostname).toBe('127.0.0.1');
    expect(appUri.port).toBe(port);
    expect(appUri.pathname).toMatch(/^\/vitest_[a-f0-9]{12}$/);
  });

  it.each([
    ['Atlas SRV', 'mongodb+srv://user:pass@cluster0.example.mongodb.net/prod'],
    ['remote host', 'mongodb://db.example.com:27017/prod'],
    ['local dev mongod on the default port', 'mongodb://127.0.0.1:27017/steptosoft'],
    ['credentials on the test port', `mongodb://user:pass@127.0.0.1:${port}/x`],
    ['empty', ''],
    ['garbage', 'not a uri'],
  ])('refuses %s', (_label, uri) => {
    expect(() => assertTestMongoUri(uri, memoryUri)).toThrow(/test-safety/);
  });

  it('mongoose.connect itself refuses a remote URI before dialing', () => {
    expect(() => mongoose.connect('mongodb+srv://user:pass@cluster0.example.mongodb.net/prod')).toThrow(/test-safety/);
  });

  it('error messages never echo the URI (no credential leakage)', () => {
    let message = '';
    try {
      assertTestMongoUri('mongodb+srv://secretuser:secretpass@host.example/db', memoryUri);
    } catch (e) {
      message = String(e);
    }
    expect(message).toMatch(/test-safety/);
    expect(message).not.toMatch(/secretuser|secretpass|host\.example/);
  });

  it('uses the test JWT secret, never the configured one', async () => {
    const { TEST_JWT_SECRET } = await import('../helpers');
    expect(process.env.JWT_SECRET).toBe(TEST_JWT_SECRET);
  });
});
