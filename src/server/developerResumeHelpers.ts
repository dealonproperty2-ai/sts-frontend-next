import path from 'path';
import { clean } from '@/server/validation';
import { DEVELOPER_TYPES, RESUME_STATUSES } from '@/server/models/DeveloperResume';

// Where uploaded developer resumes live. Configurable so a VPS can point at a
// persistent disk — falls back to the same convention the bills module uses.
export function uploadDir() {
  const base =
    process.env.UPLOAD_DIR ||
    (process.env.NODE_ENV === 'production' ? '/tmp' : path.join(process.cwd(), 'uploads'));
  return path.join(base, 'active-resumes');
}

// Accepts a string[] or a comma-separated string; trims, de-dupes, caps length.
export function parseSkills(input: unknown): string[] {
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

export function isDeveloperType(v: string): boolean {
  return (DEVELOPER_TYPES as readonly string[]).includes(v);
}

export function isStatus(v: string): boolean {
  return (RESUME_STATUSES as readonly string[]).includes(v);
}

// Build a clean document from a request body. When `partial` is true (PATCH) only
// keys present in the body are included; otherwise (POST) every field is set.
// Returns an error string when a supplied value is invalid.
export function buildDeveloperResume(
  body: Record<string, unknown>,
  { partial }: { partial: boolean }
): { data: Record<string, unknown> } | { error: string } {
  const out: Record<string, unknown> = {};
  const has = (key: string) => !partial || body[key] !== undefined;

  if (has('name')) out.name = clean(body.name, 200);

  if (has('developerType')) {
    const v = clean(body.developerType, 40) || 'Other';
    if (!isDeveloperType(v)) return { error: `developerType must be one of: ${DEVELOPER_TYPES.join(', ')}` };
    out.developerType = v;
  }

  if (has('experienceYears')) {
    const n = Number(body.experienceYears ?? 0);
    if (!Number.isFinite(n) || n < 0 || n > 60) {
      return { error: 'experienceYears must be a number between 0 and 60' };
    }
    out.experienceYears = Math.round(n * 10) / 10;
  }

  if (has('primarySkill')) out.primarySkill = clean(body.primarySkill, 80);
  if (has('skills')) out.skills = parseSkills(body.skills);
  if (has('notes')) out.notes = clean(body.notes, 3000);

  if (has('status')) {
    const v = clean(body.status, 20) || 'active';
    if (!isStatus(v)) return { error: "status must be 'active' or 'inactive'" };
    out.status = v;
  }

  // File references are produced by the upload route; only accept our own paths.
  const filePrefix = '/api/admin/active-resumes/file/';
  if (has('resumeUrl')) {
    const v = clean(body.resumeUrl, 500);
    if (v && !v.startsWith(filePrefix)) return { error: 'Invalid resumeUrl' };
    out.resumeUrl = v;
  }
  if (has('resumeName')) out.resumeName = clean(body.resumeName, 260);
  if (has('resumeType')) out.resumeType = clean(body.resumeType, 120);
  if (has('resumeSize')) out.resumeSize = Number(body.resumeSize) || 0;
  if (has('profileImageUrl')) {
    const v = clean(body.profileImageUrl, 500);
    if (v && !v.startsWith(filePrefix)) return { error: 'Invalid profileImageUrl' };
    out.profileImageUrl = v;
  }

  return { data: out };
}
