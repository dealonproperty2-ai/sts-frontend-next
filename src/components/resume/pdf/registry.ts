import type { ComponentType } from 'react';
import type { ResumeView } from '@/lib/resumeView';
import type { CompanyBranding } from '@/lib/branding';
import type { ResumeTemplate } from '@/lib/adminApi';
import CorporateSidebar from './templates/CorporateSidebar';
import ExecutiveProfessional from './templates/ExecutiveProfessional';
import { RESUME_TEMPLATES, getTemplateMeta, isPdfTemplate, DEFAULT_TEMPLATE } from '../templateMeta';

/** Every pdf template receives exactly this contract — data plus branding. */
export interface TemplateProps {
  view: ResumeView;
  branding: CompanyBranding;
}

/**
 * Binds template ids to their pdf components.
 *
 * Adding a template: create the component, add its entry to templateMeta.ts,
 * then register the component here. Nothing else in the app changes.
 */
export const PDF_COMPONENTS: Partial<Record<ResumeTemplate, ComponentType<TemplateProps>>> = {
  'corporate-sidebar': CorporateSidebar,
  'executive-professional': ExecutiveProfessional,
};

/** Resolves the component for a template id, falling back to the default. */
export function resolvePdfComponent(id?: string): ComponentType<TemplateProps> {
  const direct = id ? PDF_COMPONENTS[id as ResumeTemplate] : undefined;
  return direct ?? (PDF_COMPONENTS[DEFAULT_TEMPLATE] as ComponentType<TemplateProps>);
}

// Re-exported so callers have a single import site for template concerns.
export { RESUME_TEMPLATES, getTemplateMeta, isPdfTemplate, DEFAULT_TEMPLATE };
export type { ResumeTemplateMeta, TemplateTag } from '../templateMeta';
