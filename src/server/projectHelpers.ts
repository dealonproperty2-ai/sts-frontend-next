import { clean } from '@/server/validation';

// Accepts a string[] or a comma-separated string; returns a trimmed, de-duped list.
export function parseTechnologies(input: unknown): string[] {
  const raw = Array.isArray(input)
    ? input.map((t) => String(t))
    : typeof input === 'string'
      ? input.split(',')
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const v = item.trim().slice(0, 60);
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out.slice(0, 50);
}

// Optional URL field: empty is allowed; if present it must look like a URL.
// Returns the cleaned value, or null to signal an invalid (non-http) URL.
export function cleanOptionalUrl(input: unknown): string | null {
  const v = clean(input, 500);
  if (!v) return '';
  if (!/^https?:\/\/.+/i.test(v)) return null;
  return v;
}
