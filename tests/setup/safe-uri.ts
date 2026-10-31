const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/**
 * Throws unless `uri` points at the in-memory test server (`allowedUri`).
 * Matching the exact loopback port also rules out a developer's local
 * mongod on :27017, not just Atlas. Never echoes the URI — it may hold
 * credentials.
 */
export function assertTestMongoUri(uri: unknown, allowedUri: string): asserts uri is string {
  if (typeof uri !== 'string' || !uri) {
    throw new Error('[test-safety] Refusing to connect: MongoDB URI is empty.');
  }
  let target: URL;
  let allowed: URL;
  try {
    target = new URL(uri);
    allowed = new URL(allowedUri);
  } catch {
    throw new Error('[test-safety] Refusing to connect: unparseable MongoDB URI.');
  }
  if (
    target.protocol !== 'mongodb:' ||
    !LOOPBACK.has(target.hostname) ||
    target.port !== allowed.port ||
    target.username ||
    target.password
  ) {
    throw new Error(
      '[test-safety] Refusing to connect: tests may only use the in-memory MongoDB server ' +
        '(remote, SRV, credentialed or non-test URIs are blocked).'
    );
  }
}
