'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { pdf } from '@react-pdf/renderer';
import ResumePdfDocument from './ResumePdfDocument';
import type { AdminResume, ResumeMode } from '@/lib/adminApi';
import type { PdfTemplateId } from './registry';

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

export function useLogoUrl() {
  const [url, setUrl] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    if (typeof window !== 'undefined') setUrl(`${window.location.origin}/logo3.png`);
  }, []);
  return url;
}

interface Props {
  resume: AdminResume;
  mode?: ResumeMode;
  template?: PdfTemplateId;
}

/**
 * Live preview. Because this renders the real PDF, "preview === export" is
 * guaranteed rather than approximated.
 */
export default function ResumePdfPreview({ resume, mode, template }: Props) {
  const logoUrl = useLogoUrl();

  // Remount the viewer when inputs change so the document regenerates.
  const key = `${resume._id}-${mode ?? resume.resumeMode ?? 'employee'}-${template ?? resume.template}-${resume.updatedAt}`;

  return (
    <PDFViewer
      key={key}
      style={{ width: '100%', height: '100%', border: 'none' }}
      showToolbar
    >
      <ResumePdfDocument resume={resume} mode={mode} template={template} logoUrl={logoUrl} />
    </PDFViewer>
  );
}

/** Builds the PDF blob and triggers a download with a clean filename. */
export async function downloadResumePdf(
  resume: AdminResume,
  opts: { mode?: ResumeMode; template?: PdfTemplateId; logoUrl?: string } = {}
) {
  const blob = await pdf(
    <ResumePdfDocument
      resume={resume}
      mode={opts.mode}
      template={opts.template}
      logoUrl={opts.logoUrl}
    />
  ).toBlob();

  const safe = (resume.fullName || 'resume').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  const suffix = (opts.mode ?? resume.resumeMode) === 'client' ? 'Resource-Profile' : 'Resume';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${suffix}-${safe || 'document'}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
