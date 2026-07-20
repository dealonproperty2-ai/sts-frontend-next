'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import ResumePdfDocument from './ResumePdfDocument';
import type { AdminResume, ResumeMode, ResumeTemplate } from '@/lib/adminApi';
import type { CompanyBranding } from '@/lib/branding';

// react-pdf touches browser APIs — never render it on the server.
const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-4)', fontSize: 13 }}>
        Preparing document…
      </div>
    ),
  }
);

interface Props {
  resume: AdminResume;
  mode?: ResumeMode;
  template?: ResumeTemplate;
  branding?: Partial<CompanyBranding>;
}

/**
 * Live preview. Because this renders the real PDF, "preview === export" is
 * guaranteed rather than approximated.
 */
export default function ResumePdfPreview({ resume, mode, template, branding }: Props) {
  // Remount the viewer when inputs change so the document regenerates.
  const key = `${resume._id}-${mode ?? resume.resumeMode ?? 'employee'}-${template ?? resume.template}-${resume.updatedAt}`;

  return (
    <PDFViewer
      key={key}
      style={{ width: '100%', height: '100%', border: 'none' }}
      showToolbar
    >
      <ResumePdfDocument resume={resume} mode={mode} template={template} branding={branding} />
    </PDFViewer>
  );
}
