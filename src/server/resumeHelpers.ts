import { clean } from '@/server/validation';

export const VALID_TEMPLATES = ['classic', 'modern', 'minimal'] as const;

function asArray(input: unknown): unknown[] {
  return Array.isArray(input) ? input : [];
}

// Accepts a string[] or comma-separated string; trims, de-dupes, caps length.
export function parseList(input: unknown, maxItems = 50, maxLen = 80): string[] {
  const raw = Array.isArray(input)
    ? input.map((t) => String(t))
    : typeof input === 'string'
      ? input.split(',')
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const v = item.trim().slice(0, maxLen);
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out.slice(0, maxItems);
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function sanitizeExperience(input: unknown) {
  return asArray(input)
    .slice(0, 30)
    .map((raw) => {
      const e = rec(raw);
      return {
        company: clean(e.company, 200),
        role: clean(e.role, 200),
        location: clean(e.location, 200),
        startDate: clean(e.startDate, 40),
        endDate: clean(e.endDate, 40),
        current: Boolean(e.current),
        description: clean(e.description, 3000),
      };
    })
    .filter((e) => e.company || e.role || e.description);
}

function sanitizeEducation(input: unknown) {
  return asArray(input)
    .slice(0, 20)
    .map((raw) => {
      const e = rec(raw);
      return {
        institution: clean(e.institution, 200),
        degree: clean(e.degree, 200),
        field: clean(e.field, 200),
        startDate: clean(e.startDate, 40),
        endDate: clean(e.endDate, 40),
        grade: clean(e.grade, 60),
      };
    })
    .filter((e) => e.institution || e.degree);
}

function sanitizeProjects(input: unknown) {
  return asArray(input)
    .slice(0, 30)
    .map((raw) => {
      const p = rec(raw);
      return {
        name: clean(p.name, 200),
        description: clean(p.description, 2000),
        link: clean(p.link, 500),
        technologies: parseList(p.technologies, 30, 60),
      };
    })
    .filter((p) => p.name || p.description);
}

function sanitizeSkillCategories(input: unknown) {
  return asArray(input)
    .slice(0, 20)
    .map((raw) => {
      const c = rec(raw);
      return {
        label: clean(c.label, 80),
        items: parseList(c.items, 50, 60),
      };
    })
    .filter((c) => c.items.length > 0);
}

function sanitizeCertifications(input: unknown) {
  return asArray(input)
    .slice(0, 30)
    .map((raw) => {
      const c = rec(raw);
      return {
        name: clean(c.name, 200),
        issuer: clean(c.issuer, 200),
        date: clean(c.date, 40),
      };
    })
    .filter((c) => c.name);
}

// Build a clean resume object from request body. When `partial` is true (PATCH),
// only keys present in the body are included; otherwise (POST) every field is set.
export function buildResume(
  body: Record<string, unknown>,
  { partial }: { partial: boolean }
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const has = (key: string) => !partial || body[key] !== undefined;

  const strFields: Array<[string, number]> = [
    ['fullName', 200], ['headline', 200], ['email', 200], ['phone', 60],
    ['location', 200], ['website', 500], ['linkedin', 500], ['github', 500],
    ['summary', 3000],
  ];
  for (const [key, max] of strFields) {
    if (has(key)) out[key] = clean(body[key], max);
  }

  if (has('skills')) out.skills = parseList(body.skills);
  if (has('skillCategories')) out.skillCategories = sanitizeSkillCategories(body.skillCategories);
  if (has('languages')) out.languages = parseList(body.languages, 30, 60);
  if (has('experience')) out.experience = sanitizeExperience(body.experience);
  if (has('education')) out.education = sanitizeEducation(body.education);
  if (has('projects')) out.projects = sanitizeProjects(body.projects);
  if (has('certifications')) out.certifications = sanitizeCertifications(body.certifications);

  if (has('template')) {
    const t = clean(body.template, 20);
    out.template = (VALID_TEMPLATES as readonly string[]).includes(t) ? t : 'classic';
  }

  return out;
}
