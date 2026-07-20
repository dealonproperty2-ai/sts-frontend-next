import type { ResumeTemplate, ResumeMode } from '@/lib/adminApi';

/**
 * Data-only template catalogue.
 *
 * Deliberately free of component imports so that any surface (the builder form,
 * the listing, a settings page) can read template metadata without pulling the
 * react-pdf runtime into its bundle. Component binding lives in
 * pdf/registry.tsx, which imports this file.
 */

/** Badges shown on the template cards. */
export type TemplateTag = 'Employee' | 'Client' | 'ATS' | 'Executive' | 'Corporate';

/** Which renderer produces the document. */
export type TemplateEngine = 'pdf' | 'html';

export interface ResumeTemplateMeta {
  id: ResumeTemplate;
  name: string;
  description: string;
  /** Where this template is the right choice. */
  recommendedFor: TemplateTag[];
  /** Modes the template is designed for. */
  modeSupported: ResumeMode[];
  engine: TemplateEngine;
  thumbnail: string;
  /** True for the premium text-PDF templates (ATS parseable). */
  atsOptimised: boolean;
}

/**
 * THE registry. Adding a template = add one entry here (and, for pdf engines,
 * one component binding in pdf/registry.tsx). No conditionals anywhere else.
 */
export const RESUME_TEMPLATES: ResumeTemplateMeta[] = [
  {
    id: 'corporate-sidebar',
    name: 'Corporate Sidebar',
    description: 'Two-column enterprise profile: a facts rail for skills and availability beside a narrative column.',
    recommendedFor: ['Client', 'Corporate', 'ATS'],
    modeSupported: ['employee', 'client'],
    engine: 'pdf',
    thumbnail: '/resume-templates/corporate-sidebar.png',
    atsOptimised: true,
  },
  {
    id: 'executive-professional',
    name: 'Executive Professional',
    description: 'Single-column executive layout with a strict reading order — the safest choice for resume parsers.',
    recommendedFor: ['Employee', 'Executive', 'ATS'],
    modeSupported: ['employee', 'client'],
    engine: 'pdf',
    thumbnail: '/resume-templates/executive-professional.png',
    atsOptimised: true,
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional serif single column. Image-based export — best for printing, not for ATS submission.',
    recommendedFor: ['Employee'],
    modeSupported: ['employee'],
    engine: 'html',
    thumbnail: '/resume-templates/classic.png',
    atsOptimised: false,
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Dark accent sidebar with chip-style skills. Visual first; image-based export.',
    recommendedFor: ['Employee'],
    modeSupported: ['employee'],
    engine: 'html',
    thumbnail: '/resume-templates/modern.png',
    atsOptimised: false,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, spacious and understated. Image-based export.',
    recommendedFor: ['Employee'],
    modeSupported: ['employee'],
    engine: 'html',
    thumbnail: '/resume-templates/minimal.png',
    atsOptimised: false,
  },
];

const BY_ID = new Map(RESUME_TEMPLATES.map((t) => [t.id, t]));

export function getTemplateMeta(id?: string): ResumeTemplateMeta | undefined {
  return id ? BY_ID.get(id as ResumeTemplate) : undefined;
}

/** True when the template renders through react-pdf (real text PDF). */
export function isPdfTemplate(id?: string): boolean {
  return getTemplateMeta(id)?.engine === 'pdf';
}

/** Templates that declare support for a given resume mode. */
export function templatesForMode(mode: ResumeMode): ResumeTemplateMeta[] {
  return RESUME_TEMPLATES.filter((t) => t.modeSupported.includes(mode));
}

export const DEFAULT_TEMPLATE: ResumeTemplate = 'executive-professional';
