import type {
  AdminResume,
  ResumeExperience,
  ResumeProjectItem,
  ResumeMode,
  ResumeSkillCategory,
} from '@/lib/adminApi';

/**
 * Normalised, mode-masked view of a resume.
 *
 * SECURITY: in `client` mode the contact fields are *structurally absent* from
 * this object — they are never passed to the renderer, so they cannot appear in
 * the PDF byte stream. This is deliberately not a CSS/visibility concern: hidden
 * text in a PDF is still extractable.
 */
export interface ResumeView {
  mode: ResumeMode;
  fullName: string;
  headline: string;
  summary: string;
  photoUrl: string;

  /** Present only in employee mode. */
  contact: {
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
    github?: string;
  };

  yearsOfExperience: number;
  availability: string;
  englishLevel: string;
  noticePeriod: string;
  /** Work location for a resource profile — distinct from personal address. */
  currentLocation: string;
  preferredTimeZone: string;
  primaryTechStack: string[];

  skillGroups: ResumeSkillCategory[];
  coreCompetencies: string[];
  experience: ResumeExperience[];
  projects: ResumeProjectItem[];
  education: AdminResume['education'];
  certifications: AdminResume['certifications'];
  languages: string[];
  achievements: string[];
  interests: string[];
  references: NonNullable<AdminResume['references']>;
}

/* ── Automatic skill grouping ─────────────────────────────────────────────── */

const SKILL_BUCKETS: { label: string; match: RegExp }[] = [
  {
    label: 'Frontend',
    match: /^(react|react\.js|reactjs|next|next\.js|nextjs|vue|angular|svelte|redux|redux toolkit|zustand|tailwind|tailwind css|bootstrap|material ui|mui|sass|scss|html|html5|css|css3|javascript|typescript|jquery|ember|backbone|context api|framer motion|webpack|vite)$/i,
  },
  {
    label: 'Backend',
    match: /^(node|node\.js|nodejs|express|express\.js|nest|nestjs|nest\.js|django|flask|fastapi|spring|spring boot|laravel|rails|\.net|asp\.net|php|graphql|rest|restful api|grpc|socket\.io|microservices)$/i,
  },
  {
    label: 'Database',
    match: /^(mongodb|mongoose|mysql|postgres|postgresql|sqlite|redis|dynamodb|firestore|firebase|elasticsearch|cassandra|oracle|mssql|sql|prisma|typeorm|sequelize)$/i,
  },
  {
    label: 'Cloud',
    match: /^(aws|amazon web services|azure|gcp|google cloud|vercel|netlify|render|heroku|digitalocean|cloudflare|s3|ec2|lambda|cloudfront)$/i,
  },
  {
    label: 'DevOps',
    match: /^(docker|kubernetes|k8s|terraform|ansible|jenkins|github actions|gitlab ci|circleci|ci\/cd|nginx|linux|bash|prometheus|grafana)$/i,
  },
  {
    label: 'Languages',
    match: /^(java|python|c|c\+\+|c#|go|golang|rust|ruby|kotlin|swift|scala|dart|php|r|perl|elixir)$/i,
  },
  {
    label: 'Tools',
    match: /^(git|github|gitlab|bitbucket|jira|postman|swagger|figma|photoshop|vs code|visual studio code|webstorm|slack|notion|trello|robo 3t|ms office|agile|scrum)$/i,
  },
];

/**
 * Groups a flat skill list into the standard buckets. Anything unrecognised is
 * collected under "Other" so no skill is ever silently dropped.
 */
export function groupSkills(skills: string[]): ResumeSkillCategory[] {
  const buckets = new Map<string, string[]>();
  const other: string[] = [];

  for (const raw of skills) {
    const skill = raw.trim();
    if (!skill) continue;
    const bucket = SKILL_BUCKETS.find((b) => b.match.test(skill));
    if (bucket) {
      const list = buckets.get(bucket.label) ?? [];
      list.push(skill);
      buckets.set(bucket.label, list);
    } else {
      other.push(skill);
    }
  }

  // Preserve the canonical bucket order, then Other.
  const ordered: ResumeSkillCategory[] = [];
  for (const b of SKILL_BUCKETS) {
    const items = buckets.get(b.label);
    if (items?.length) ordered.push({ label: b.label, items });
  }
  if (other.length) ordered.push({ label: 'Other', items: other });
  return ordered;
}

/* ── View builder ─────────────────────────────────────────────────────────── */

const nonEmpty = (v?: string) => (v ?? '').trim();

/**
 * Builds the render-ready view. `modeOverride` lets the preview switch modes
 * without persisting, falling back to the stored resumeMode.
 */
export function buildResumeView(resume: AdminResume, modeOverride?: ResumeMode): ResumeView {
  const mode: ResumeMode = modeOverride ?? resume.resumeMode ?? 'employee';
  const isClient = mode === 'client';

  // Manual categories win; otherwise auto-group the flat list.
  const manual = (resume.skillCategories ?? []).filter((c) => c.items?.length);
  const skillGroups = manual.length ? manual : groupSkills(resume.skills ?? []);

  return {
    mode,
    fullName: nonEmpty(resume.fullName),
    headline: nonEmpty(resume.headline),
    summary: nonEmpty(resume.summary),
    // A client resource profile is anonymised — no personal photo.
    photoUrl: isClient ? '' : nonEmpty(resume.photoUrl),

    // Contact block is omitted entirely for client resource profiles.
    contact: isClient
      ? {}
      : {
          email: nonEmpty(resume.email) || undefined,
          phone: nonEmpty(resume.phone) || undefined,
          location: nonEmpty(resume.location) || undefined,
          website: nonEmpty(resume.website) || undefined,
          linkedin: nonEmpty(resume.linkedin) || undefined,
          github: nonEmpty(resume.github) || undefined,
        },

    yearsOfExperience: resume.yearsOfExperience ?? 0,
    availability: nonEmpty(resume.availability),
    englishLevel: nonEmpty(resume.englishLevel),
    noticePeriod: nonEmpty(resume.noticePeriod),
    // A city/region for staffing purposes is fine to share; the personal street
    // address (contact.location) is still withheld in client mode.
    currentLocation: nonEmpty(resume.currentLocation),
    preferredTimeZone: nonEmpty(resume.preferredTimeZone),
    primaryTechStack: resume.primaryTechStack ?? [],

    skillGroups,
    coreCompetencies: resume.coreCompetencies ?? [],
    experience: resume.experience ?? [],
    // Client profiles must not expose personal repo/live links.
    projects: (resume.projects ?? []).map((p) =>
      isClient ? { ...p, link: '', liveUrl: '', repoUrl: '' } : p
    ),
    education: resume.education ?? [],
    certifications: resume.certifications ?? [],
    languages: resume.languages ?? [],
    achievements: resume.achievements ?? [],
    // Interests and references are personal — not part of a resource profile.
    interests: isClient ? [] : (resume.interests ?? []),
    references: isClient ? [] : (resume.references ?? []),
  };
}
