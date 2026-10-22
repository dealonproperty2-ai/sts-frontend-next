import { describe, expect, it } from 'vitest';
import { generateBackupCodes, generateBase32Secret, generateTOTP, otpAuthUri, verifyTOTP } from '@/server/totp';

describe('TOTP (RFC 6238)', () => {
  // RFC 6238 Appendix B, SHA-1 seed "12345678901234567890" in base32; last 6 digits.
  const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('matches the RFC test vector at T=%i', (seconds, code) => {
    expect(generateTOTP(RFC_SECRET, seconds * 1000)).toBe(code);
  });

  it('verifies the current code and ±1 step of drift, but not beyond', () => {
    const secret = generateBase32Secret();
    const now = Date.now();
    expect(verifyTOTP(secret, generateTOTP(secret, now))).toBe(true);
    expect(verifyTOTP(secret, generateTOTP(secret, now - 30_000))).toBe(true);
    expect(verifyTOTP(secret, generateTOTP(secret, now + 30_000))).toBe(true);
    expect(verifyTOTP(secret, generateTOTP(secret, now - 5 * 30_000))).toBe(false);
  });

  it.each(['', '12345', '1234567', 'abcdef', '      '])('rejects malformed code %j', (code) => {
    expect(verifyTOTP(generateBase32Secret(), code)).toBe(false);
  });

  it('generates distinct base32 secrets and unique uppercase backup codes', () => {
    expect(generateBase32Secret()).toMatch(/^[A-Z2-7]{32}$/);
    expect(generateBase32Secret()).not.toBe(generateBase32Secret());
    const codes = generateBackupCodes(8);
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const c of codes) expect(c).toBe(c.toUpperCase());
  });

  it('builds an otpauth URI with encoded issuer and account', () => {
    const uri = otpAuthUri('ABC', 'a+b@test.local');
    expect(uri).toMatch(/^otpauth:\/\/totp\/Step%20To%20Soft:a%2Bb%40test\.local\?/);
    expect(uri).toContain('secret=ABC');
  });
});
