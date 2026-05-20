type Bucket = { count: number; resetAt: number };

const STORE: Map<string, Bucket> = (() => {
  const g = globalThis as { __rateStore?: Map<string, Bucket> };
  if (!g.__rateStore) g.__rateStore = new Map();
  return g.__rateStore;
})();

function evictExpired() {
  const now = Date.now();
  STORE.forEach((b, k) => { if (b.resetAt < now) STORE.delete(k); });
}

let _lastEvict = 0;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Evict expired entries at most once per minute to prevent memory growth
  if (now - _lastEvict > 60_000) { evictExpired(); _lastEvict = now; }

  const b = STORE.get(key);
  if (!b || b.resetAt < now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    STORE.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}

export function clientKey(req: Request, scope: string) {
  const fwd = req.headers.get('x-forwarded-for') || '';
  const ip = fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}`;
}
