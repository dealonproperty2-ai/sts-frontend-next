import { clean } from '@/server/validation';

export const VALID_TEMPLATES = [
  'classic', 'modern', 'minimal',
  'corporate-sidebar', 'executive-professional',
] as const;

export const VALID_RESUME_MODES = ['employee', 'client'] as const;

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

// Bullet lists (responsibilities, achievements, highlights). Accepts a string[] or a
// newline-separated string — never comma-split, since bullet text contains commas.
export function parseLines(input: unknown, maxItems = 30, maxLen = 400): string[] {
  const raw = Array.isArray(input)
    ? input.map((t) => String(t))
    : typeof input === 'string'
      ? input.split(/\r?\n/)
      : [];
  return raw
    .map((s) => s.replace(/^[\s•\-*]+/, '').trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
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
        employmentType: clean(e.employmentType, 60),
        technologies: parseList(e.technologies, 40, 60),
        responsibilities: parseLines(e.responsibilities, 30, 400),
        achievements: parseLines(e.achievements, 30, 400),
      };
    })
    .filter(
      (e) =>
        e.company || e.role || e.description ||
        e.responsibilities.length || e.achievements.length
    );
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
        role: clean(p.role, 120),
        duration: clean(p.duration, 80),
        liveUrl: clean(p.liveUrl, 500),
        repoUrl: clean(p.repoUrl, 500),
        responsibilities: parseLines(p.responsibilities, 30, 400),
        highlights: parseLines(p.highlights, 30, 400),
      };
    })
    .filter((p) => p.name || p.description || p.responsibilities.length || p.highlights.length);
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

function sanitizeReferences(input: unknown) {
  return asArray(input)
    .slice(0, 10)
    .map((raw) => {
      const r = rec(raw);
      return {
        name: clean(r.name, 200),
        designation: clean(r.designation, 200),
        company: clean(r.company, 200),
        contact: clean(r.contact, 200),
      };
    })
    .filter((r) => r.name || r.company);
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
    // Premium-template additions
    ['photoUrl', 500], ['availability', 120], ['englishLevel', 60],
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

  if (has('coreCompetencies')) out.coreCompetencies = parseList(body.coreCompetencies, 30, 80);
  if (has('achievements')) out.achievements = parseLines(body.achievements, 30, 400);
  if (has('interests')) out.interests = parseList(body.interests, 30, 60);
  if (has('references')) out.references = sanitizeReferences(body.references);

  if (has('yearsOfExperience')) {
    const n = Number(body.yearsOfExperience ?? 0);
    out.yearsOfExperience = Number.isFinite(n) && n >= 0 && n <= 60 ? Math.round(n * 10) / 10 : 0;
  }

  if (has('resumeMode')) {
    const m = clean(body.resumeMode, 20);
    out.resumeMode = (VALID_RESUME_MODES as readonly string[]).includes(m) ? m : 'employee';
  }

  if (has('template')) {
    const t = clean(body.template, 40);
    out.template = (VALID_TEMPLATES as readonly string[]).includes(t) ? t : 'classic';
  }

  return out;
}
