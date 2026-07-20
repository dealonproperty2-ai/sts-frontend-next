import * as React from 'react';
import { Document } from '@react-pdf/renderer';
import type { AdminResume, ResumeMode } from '@/lib/adminApi';
import { buildResumeView } from '@/lib/resumeView';
import { isPdfTemplate, type PdfTemplateId } from './registry';
import CorporateSidebar from './templates/CorporateSidebar';
import ExecutiveProfessional from './templates/ExecutiveProfessional';

const TEMPLATES = {
  'corporate-sidebar': CorporateSidebar,
  'executive-professional': ExecutiveProfessional,
} as const;

export interface ResumePdfDocumentProps {
  resume: AdminResume;
  /** Preview-only override; falls back to the stored resumeMode. */
  mode?: ResumeMode;
  /** Template override; falls back to the resume's stored template. */
  template?: PdfTemplateId;
  logoUrl?: string;
}

/**
 * Root PDF document. Builds the mode-masked view once, then delegates to the
 * selected template. Contact data never reaches a client-mode template because
 * buildResumeView omits it from the object entirely.
 */
export default function ResumePdfDocument({
  resume, mode, template, logoUrl,
}: ResumePdfDocumentProps) {
  const view = buildResumeView(resume, mode);

  const id: PdfTemplateId = isPdfTemplate(template)
    ? template
    : isPdfTemplate(resume.template)
      ? resume.template
      : 'executive-professional';

  const Template = TEMPLATES[id];

  const title = [view.fullName || 'Resume', view.headline].filter(Boolean).join(' — ');

  return (
    <Document
      title={title}
      author={view.mode === 'client' ? 'Step To Soft Pvt. Ltd.' : view.fullName || undefined}
      subject={view.mode === 'client' ? 'Technical Resource Profile' : 'Resume'}
      creator="Step To Soft Resume Builder"
      producer="Step To Soft"
    >
      <Template view={view} logoUrl={logoUrl} />
    </Document>
  );
}
