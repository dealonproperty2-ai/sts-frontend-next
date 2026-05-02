export function isEmail(s: unknown): s is string {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function isNonEmptyString(s: unknown, max = 5000): s is string {
  return typeof s === 'string' && s.trim().length > 0 && s.length <= max;
}

export function clean(s: unknown, max = 5000): string {
  if (typeof s !== 'string') return '';
  return s.trim().slice(0, max);
}
