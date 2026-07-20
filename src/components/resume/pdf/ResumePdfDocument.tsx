import * as React from 'react';
import { Document } from '@react-pdf/renderer';
import type { AdminResume, ResumeMode, ResumeTemplate } from '@/lib/adminApi';
import { buildResumeView } from '@/lib/resumeView';
import { resolveBranding, type CompanyBranding } from '@/lib/branding';
import { resolvePdfComponent } from './registry';

export interface ResumePdfDocumentProps {
  resume: AdminResume;
  /** Preview-only override; falls back to the stored resumeMode. */
  mode?: ResumeMode;
  /** Template override; falls back to the resume's stored template. */
  template?: ResumeTemplate;
  /** White-label overrides for client resource profiles. */
  branding?: Partial<CompanyBranding>;
}

/**
 * Root PDF document: builds the mode-masked view, resolves branding, then hands
 * both to whichever template the registry returns. No template conditionals.
 */
export default function ResumePdfDocument({
  resume, mode, template, branding,
}: ResumePdfDocumentProps) {
  const view = buildResumeView(resume, mode);
  const resolved = resolveBranding(branding);
  const Template = resolvePdfComponent(template ?? resume.template);

  const title = [view.fullName || 'Resume', view.headline].filter(Boolean).join(' — ');
  const isClient = view.mode === 'client';

  return (
    <Document
      title={title}
      author={isClient ? resolved.name : view.fullName || undefined}
      subject={isClient ? 'Technical Resource Profile' : 'Resume'}
      creator={resolved.name}
      producer={resolved.name}
    >
      <Template view={view} branding={resolved} />
    </Document>
  );
}
