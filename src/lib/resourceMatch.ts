/**
 * Client-requirement → resource match scoring.
 *
 * Pure and dependency-free so the API can sort by score server-side and the UI
 * can render the same breakdown. Only the criteria actually present in the
 * requirement contribute, and the weighted result is normalised to 0–100, so a
 * requirement with two fields and one with six are both scored fairly.
 */

export interface ResourceRequirement {
  technology?: string;
  skills?: string[];
  minExperience?: number;
  availability?: string;
  maxNoticePeriodDays?: number;
  location?: string;
}

export interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
}

/** Minimal shape the scorer needs — a subset of the resource. */
export interface MatchableResource {
  skills?: string[];
  primaryTechnology?: string;
  secondaryTechnology?: string;
  experienceYears?: number;
  availabilityStatus?: string;
  noticePeriod?: string;
  location?: string;
  timeZone?: string;
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

/** Best-effort conversion of a free-text notice period to days. */
export function noticePeriodToDays(value?: string): number {
  const v = norm(value);
  if (!v || v === 'immediate' || v === 'available' || v === 'immediately') return 0;
  const num = parseFloat(v.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(num)) return 0;
  if (/month/.test(v)) return Math.round(num * 30);
  if (/week/.test(v)) return Math.round(num * 7);
  return Math.round(num); // days (or bare number)
}

const REQUIREMENT_FIELDS: (keyof ResourceRequirement)[] = [
  'technology', 'skills', 'minExperience', 'availability', 'maxNoticePeriodDays', 'location',
];

/** True when the requirement constrains at least one dimension. */
export function hasRequirement(req?: ResourceRequirement | null): boolean {
  if (!req) return false;
  return REQUIREMENT_FIELDS.some((k) => {
    const v = req[k];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'number') return Number.isFinite(v) && v > 0;
    return !!(v && String(v).trim());
  });
}

export function scoreResource(resource: MatchableResource, req: ResourceRequirement): MatchResult {
  const resSkills = (resource.skills ?? []).map(norm);
  const resSkillSet = new Set(resSkills);
  const primary = norm(resource.primaryTechnology);
  const secondary = norm(resource.secondaryTechnology);

  const parts: { weight: number; sat: number }[] = [];
  const reasons: string[] = [];
  let matchedSkills: string[] = [];
  let missingSkills: string[] = [];

  // Technology (weight 3)
  if (req.technology && req.technology.trim()) {
    const t = norm(req.technology);
    let sat = 0;
    if (primary === t || resSkillSet.has(t)) sat = 1;
    else if (secondary === t) sat = 0.7;
    else if (primary.includes(t) || resSkills.some((s) => s.includes(t))) sat = 0.4;
    parts.push({ weight: 3, sat });
    reasons.push(sat >= 1 ? `Primary tech: ${req.technology}` : sat > 0 ? `Related tech: ${req.technology}` : `Missing tech: ${req.technology}`);
  }

  // Skills overlap (weight 4)
  if (req.skills && req.skills.length) {
    const reqSkills = req.skills.map((s) => s.trim()).filter(Boolean);
    matchedSkills = reqSkills.filter((s) => resSkillSet.has(norm(s)));
    missingSkills = reqSkills.filter((s) => !resSkillSet.has(norm(s)));
    parts.push({ weight: 4, sat: reqSkills.length ? matchedSkills.length / reqSkills.length : 1 });
    reasons.push(`Skills ${matchedSkills.length}/${reqSkills.length}`);
  }

  // Experience (weight 2)
  if (req.minExperience && req.minExperience > 0) {
    const yrs = resource.experienceYears ?? 0;
    const sat = yrs >= req.minExperience ? 1 : Math.max(0, yrs / req.minExperience);
    parts.push({ weight: 2, sat });
    reasons.push(`Experience ${yrs}y / need ${req.minExperience}y`);
  }

  // Availability (weight 2)
  if (req.availability && req.availability.trim()) {
    const want = norm(req.availability);
    const have = norm(resource.availabilityStatus);
    let sat = 0;
    if (have === want) sat = 1;
    else if (want === 'available' && (have === 'joining_soon' || have === 'reserved')) sat = 0.5;
    parts.push({ weight: 2, sat });
    reasons.push(sat >= 1 ? 'Availability matches' : sat > 0 ? 'Availability close' : 'Availability differs');
  }

  // Notice period (weight 1)
  if (req.maxNoticePeriodDays && req.maxNoticePeriodDays > 0) {
    const days = noticePeriodToDays(resource.noticePeriod);
    const sat = days <= req.maxNoticePeriodDays ? 1 : Math.max(0, 1 - (days - req.maxNoticePeriodDays) / (req.maxNoticePeriodDays || 1));
    parts.push({ weight: 1, sat });
    reasons.push(`Notice ${days}d / max ${req.maxNoticePeriodDays}d`);
  }

  // Location (weight 1)
  if (req.location && req.location.trim()) {
    const loc = norm(req.location);
    const resLoc = norm(resource.location);
    const sat = resLoc && (resLoc.includes(loc) || loc.includes(resLoc)) ? 1 : 0;
    parts.push({ weight: 1, sat });
    reasons.push(sat ? `Location: ${resource.location}` : 'Location differs');
  }

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const score = totalWeight
    ? Math.round((parts.reduce((s, p) => s + p.weight * p.sat, 0) / totalWeight) * 100)
    : 0;

  return { score, matchedSkills, missingSkills, reasons };
}
