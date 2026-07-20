import type { ComponentType } from 'react';
import type { ResumeView } from '@/lib/resumeView';
import type { ResumeTemplate } from '@/lib/adminApi';

/** Every premium template receives exactly this contract. */
export interface TemplateProps {
  view: ResumeView;
  /** Absolute URL to the company logo (client resource profiles only). */
  logoUrl?: string;
}

export type PdfTemplateId = Extract<
  ResumeTemplate,
  'corporate-sidebar' | 'executive-professional'
>;

export interface PdfTemplateMeta {
  id: PdfTemplateId;
  label: string;
  description: string;
}

/**
 * Registry of react-pdf templates.
 *
 * To add a future template: create the component under ./templates, then add one
 * entry here and one lazy import in ResumePdfDocument. Nothing else changes.
 */
export const PDF_TEMPLATES: PdfTemplateMeta[] = [
  {
    id: 'corporate-sidebar',
    label: 'Corporate Sidebar',
    description: 'Two-column enterprise profile — facts rail + narrative column.',
  },
  {
    id: 'executive-professional',
    label: 'Executive Professional',
    description: 'Single-column executive layout — maximum ATS clarity.',
  },
];

const PDF_TEMPLATE_IDS = new Set<string>(PDF_TEMPLATES.map((t) => t.id));

/** True when a template renders through react-pdf rather than the legacy HTML path. */
export function isPdfTemplate(template?: string): template is PdfTemplateId {
  return !!template && PDF_TEMPLATE_IDS.has(template);
}

export type { ComponentType };
