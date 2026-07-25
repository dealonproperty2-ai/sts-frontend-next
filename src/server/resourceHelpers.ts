import path from 'path';
import { clean } from '@/server/validation';
import { RESOURCE_TYPES, AVAILABILITY_STATUSES } from '@/server/models/Resource';

// Where uploaded resource files (resume, photo) live. Configurable so a VPS can
// point at a persistent disk; falls back to the project-local convention.
export function uploadDir() {
  const base =
    process.env.UPLOAD_DIR ||
    (process.env.NODE_ENV === 'production' ? '/tmp' : path.join(process.cwd(), 'uploads'));
  return path.join(base, 'resources');
}

export function isResourceType(v: string): boolean {
  return (RESOURCE_TYPES as readonly string[]).includes(v);
}
export function isAvailabilityStatus(v: string): boolean {
  return (AVAILABILITY_STATUSES as readonly string[]).includes(v);
}

// string[] | comma-separated string → trimmed, de-duped, capped list.
export function parseList(input: unknown, maxItems = 60, maxLen = 60): string[] {
  const raw = Array.isArray(input)
    ? input.map((t) => String(t))
    : typeof input === 'string'
      ? input.split(',')
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const v = item.trim().slice(0, maxLen);
    if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); }
  }
  return out.slice(0, maxItems);
}

// Bullet lists split on newlines (text may contain commas).
export function parseLines(input: unknown, maxItems = 30, maxLen = 400): string[] {
  const raw = Array.isArray(input)
    ? input.map((t) => String(t))
    : typeof input === 'string'
      ? input.split(/\r?\n/)
      : [];
  return raw.map((s) => s.replace(/^[\s•\-*]+/, '').trim().slice(0, maxLen)).filter(Boolean).slice(0, maxItems);
}

function asArray(v: unknown): unknown[] { return Array.isArray(v) ? v : []; }
function rec(v: unknown): Record<string, unknown> { return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}; }

function sanitizeCertifications(input: unknown) {
  return asArray(input).slice(0, 30).map((raw) => {
    const c = rec(raw);
    return { name: clean(c.name, 200), issuer: clean(c.issuer, 200), date: clean(c.date, 40) };
  }).filter((c) => c.name);
}

function sanitizeExperience(input: unknown) {
  return asArray(input).slice(0, 30).map((raw) => {
    const e = rec(raw);
    return {
      company: clean(e.company, 200), role: clean(e.role, 200), location: clean(e.location, 200),
      startDate: clean(e.startDate, 40), endDate: clean(e.endDate, 40), current: Boolean(e.current),
      description: clean(e.description, 3000), responsibilities: parseLines(e.responsibilities),
    };
  }).filter((e) => e.company || e.role || e.description || e.responsibilities.length);
}

function sanitizeProjects(input: unknown) {
  return asArray(input).slice(0, 30).map((raw) => {
    const p = rec(raw);
    return {
      name: clean(p.name, 200), description: clean(p.description, 2000), role: clean(p.role, 120),
      duration: clean(p.duration, 80), link: clean(p.link, 500), technologies: parseList(p.technologies, 30, 60),
    };
  }).filter((p) => p.name || p.description);
}

function sanitizeEducation(input: unknown) {
  return asArray(input).slice(0, 20).map((raw) => {
    const e = rec(raw);
    return {
      institution: clean(e.institution, 200), degree: clean(e.degree, 200), field: clean(e.field, 200),
      startDate: clean(e.startDate, 40), endDate: clean(e.endDate, 40), grade: clean(e.grade, 60),
    };
  }).filter((e) => e.institution || e.degree);
}

const FILE_PREFIX = '/api/admin/resources/file/';

/**
 * Build a clean resource document from a request body. `partial` (PATCH) only
 * includes keys present in the body; otherwise every field is set. Returns an
 * error string when a supplied enum value is invalid.
 */
export function buildResource(
  body: Record<string, unknown>,
  { partial }: { partial: boolean }
): { data: Record<string, unknown> } | { error: string } {
  const out: Record<string, unknown> = {};
  const has = (k: string) => !partial || body[k] !== undefined;

  const strFields: Array<[string, number]> = [
    ['fullName', 200], ['employeeCode', 60], ['designation', 200],
    ['primaryTechnology', 80], ['secondaryTechnology', 80], ['currentCompany', 200],
    ['location', 200], ['timeZone', 120], ['portfolioUrl', 500], ['linkedinUrl', 500],
    ['githubUrl', 500], ['englishLevel', 60], ['noticePeriod', 120],
    ['expectedJoiningDate', 60], ['summary', 4000],
  ];
  for (const [k, max] of strFields) if (has(k)) out[k] = clean(body[k], max);

  if (has('resourceType')) {
    const v = clean(body.resourceType, 20) || 'internal';
    if (!isResourceType(v)) return { error: `resourceType must be one of: ${RESOURCE_TYPES.join(', ')}` };
    out.resourceType = v;
  }
  if (has('availabilityStatus')) {
    const v = clean(body.availabilityStatus, 30) || 'available';
    if (!isAvailabilityStatus(v)) return { error: `availabilityStatus must be one of: ${AVAILABILITY_STATUSES.join(', ')}` };
    out.availabilityStatus = v;
  }
  if (has('experienceYears')) {
    const n = Number(body.experienceYears ?? 0);
    if (!Number.isFinite(n) || n < 0 || n > 60) return { error: 'experienceYears must be between 0 and 60' };
    out.experienceYears = Math.round(n * 10) / 10;
  }

  if (has('employee')) {
    const v = clean(body.employee, 40);
    out.employee = v || null;
  }
  if (has('skills')) out.skills = parseList(body.skills);
  if (has('certifications')) out.certifications = sanitizeCertifications(body.certifications);
  if (has('workExperience')) out.workExperience = sanitizeExperience(body.workExperience);
  if (has('projects')) out.projects = sanitizeProjects(body.projects);
  if (has('education')) out.education = sanitizeEducation(body.education);

  // File references are minted by the upload route; only accept our own paths.
  for (const [key, max] of [['resumeUrl', 500], ['profilePhotoUrl', 500]] as const) {
    if (has(key)) {
      const v = clean(body[key], max);
      if (v && !v.startsWith(FILE_PREFIX)) return { error: `Invalid ${key}` };
      out[key] = v;
    }
  }
  if (has('resumeName')) out.resumeName = clean(body.resumeName, 260);
  if (has('resumeType')) out.resumeType = clean(body.resumeType, 120);
  if (has('resumeSize')) out.resumeSize = Number(body.resumeSize) || 0;

  return { data: out };
}
