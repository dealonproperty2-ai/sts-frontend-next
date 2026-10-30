'use client';

import { createPortal } from 'react-dom';
import type { LetterRun } from '@/lib/appointmentLetter';
import type { ExperienceLetterContent } from '@/lib/experienceLetter';
import { SIGNATURE_BASE64 } from '@/lib/hrConstants';
import {
  BRANDED_PRINT_SPACERS, BRANDED_SHEET_PADDING, BrandedFooterHtml, BrandedHeaderHtml,
} from '@/components/letters/BrandedLetterChrome';

/**
 * HTML rendering of an experience letter — the on-screen A4 preview AND the
 * print view. Same content model and the same millimetre geometry as the
 * downloaded PDF (lib/experienceLetterPdfDoc.tsx); header and footer are the
 * shared branded ones (identical to the Internship Experience and Relieving
 * letters). Every block sets its own colour/size so the admin theme never leaks in.
 */
const INK = '#000';
const FONT = '"Times New Roman", Times, serif';

function Runs({ runs }: { runs: LetterRun[] }) {
  return (
    <>
      {runs.map((r, i) => {
        let node: React.ReactNode = r.text;
        if (r.sup) node = <sup style={{ fontSize: '7.5pt', lineHeight: 0, verticalAlign: 'super' }}>{node}</sup>;
        if (r.bold) node = <strong>{node}</strong>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

function Signature({ sig }: { sig: ExperienceLetterContent['signature'] }) {
  if (sig.mode === 'none') return <div style={{ height: '18mm' }} />;
  if (sig.mode === 'custom' && sig.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={sig.src} alt="Authorized signature" style={{ width: '39mm', height: '18mm', objectFit: 'contain', marginTop: '4mm', display: 'block' }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={SIGNATURE_BASE64} alt="HR signature" style={{ width: '39mm', height: `${(39 * 41) / 98}mm`, marginTop: '5mm', display: 'block' }} />;
}

const para = (marginTop: string, indent: boolean): React.CSSProperties => ({
  margin: `${marginTop} 0 0`, textIndent: indent ? '15mm' : 0, color: INK, fontSize: 'inherit', lineHeight: 'inherit',
  textAlign: 'justify', whiteSpace: 'pre-line', overflowWrap: 'anywhere',
});

/** The letter (letterhead → signatory), without page padding or footer. */
export function ExperienceLetterBody({ content: c }: { content: ExperienceLetterContent }) {
  return (
    <div style={{ color: INK }}>
      <BrandedHeaderHtml logo={c.logo} />
      <div style={{ fontFamily: FONT, fontSize: '11.5pt', lineHeight: 1.36, color: INK }}>
        <div style={{ marginTop: '7mm', textAlign: 'center', textDecoration: 'underline' }}>{c.title}</div>
        <div style={{ marginTop: '6mm' }}>Date: {c.issueDate}</div>

        <p style={para('6mm', true)}><Runs runs={c.intro} /></p>
        {c.remarks && <p style={para('3mm', true)}><Runs runs={c.remarks} /></p>}
        <p style={para(c.remarks ? '3mm' : '0', false)}><Runs runs={c.closing} /></p>

        <div className="el-block" style={{ marginTop: '7mm' }}>
          <div>{c.regards}</div>
          <Signature sig={c.signature} />
          {c.signatory.name && <div style={{ marginTop: '5mm' }}>{c.signatory.name}</div>}
          <div style={{ marginTop: c.signatory.name ? 0 : '5mm' }}>{c.signatory.company}</div>
          <div style={{ marginTop: '5mm' }}>
            <div>{c.signatory.department}</div>
            <div>{c.signatory.title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A4 sheet for the screen preview (footer at the bottom of the sheet). */
export function ExperienceLetterSheet({ content }: { content: ExperienceLetterContent }) {
  return (
    <div style={{ position: 'relative', width: '210mm', minHeight: '297mm', boxSizing: 'border-box', padding: BRANDED_SHEET_PADDING, background: '#fff', color: INK }}>
      <ExperienceLetterBody content={content} />
      <BrandedFooterHtml />
    </div>
  );
}

/**
 * Print view. @page has no margins (no browser header/footer); the table's
 * thead/tfoot spacers repeat on every printed page to keep text clear of the
 * page edge and of the fixed footer, which the browser repeats on every page.
 */
export const EXPERIENCE_PRINT_CSS = `
@media screen { #experience-print-root { display: none; } }
@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #fff !important; margin: 0 !important; }
  body > *:not(#experience-print-root) { display: none !important; }
  #experience-print-root { display: block !important; }
  #experience-print-root table.el-print { width: 100%; border-collapse: collapse; }
  #experience-print-root table.el-print td { padding: 0 ${BRANDED_PRINT_SPACERS.side}; }
  #experience-print-root .el-block, #experience-print-root p { break-inside: avoid; page-break-inside: avoid; }
}
`;

export function ExperiencePrintRoot({ content }: { content: ExperienceLetterContent | null }) {
  if (!content || typeof document === 'undefined') return null;
  return createPortal(
    <div id="experience-print-root" aria-hidden="true">
      <BrandedFooterHtml fixed />
      <table className="el-print">
        <thead><tr><td><div style={{ height: BRANDED_PRINT_SPACERS.top }} /></td></tr></thead>
        <tfoot><tr><td><div style={{ height: BRANDED_PRINT_SPACERS.bottom }} /></td></tr></tfoot>
        <tbody><tr><td><ExperienceLetterBody content={content} /></td></tr></tbody>
      </table>
    </div>,
    document.body,
  );
}
