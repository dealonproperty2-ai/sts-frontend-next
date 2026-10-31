'use client';

import { createPortal } from 'react-dom';
import type { LetterRun } from '@/lib/appointmentLetter';
import type { InternshipLetterContent } from '@/lib/internshipLetter';
import { SIGNATURE_BASE64 } from '@/lib/hrConstants';
import {
  BRAND_NAVY as NAVY, BRANDED_PRINT_SPACERS, BRANDED_SHEET_PADDING, BrandedFooterHtml, BrandedHeaderHtml,
} from '@/components/letters/BrandedLetterChrome';

/**
 * HTML rendering of an internship experience letter — the on-screen A4
 * preview AND the print view. Same content model and the same millimetre
 * geometry as the downloaded PDF (lib/internshipLetterPdfDoc.tsx).
 */
const INK = '#222';
const FONT = 'Helvetica, Arial, sans-serif';

function Runs({ runs }: { runs: LetterRun[] }) {
  return <>{runs.map((r, i) => (r.bold ? <strong key={i}>{r.text}</strong> : <span key={i}>{r.text}</span>))}</>;
}

/** The letter body (letterhead → signatory), without page chrome. */
export function InternshipLetterBody({ content: c }: { content: InternshipLetterContent }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: '10.5pt', lineHeight: 1.47, color: INK }}>
      <BrandedHeaderHtml logo={c.logo} />

      <div style={{ marginTop: '7mm', textAlign: 'center', fontWeight: 700, fontSize: '13pt', letterSpacing: '2.1pt', color: NAVY }}>{c.title}</div>
      <div aria-hidden="true" style={{ marginTop: '-0.5mm', textAlign: 'center', fontSize: '8pt', letterSpacing: '1.2pt', color: NAVY, lineHeight: 1 }}>_ _ _ _ _ _ _ _ _</div>
      <div style={{ marginTop: '6mm', textAlign: 'right' }}><strong style={{ color: NAVY }}>Date:</strong> {c.letterDate}</div>
      <div style={{ marginTop: '6mm', textAlign: 'center', fontWeight: 700, textDecoration: 'underline' }}>{c.subject}</div>

      {c.paragraphs.map((p, i) => (
        // Explicit colour/size: the site's global `p` rule would otherwise grey the letter text.
        <p key={i} style={{ margin: `${i === 0 ? 3 : 3.6}mm 4mm 0 0`, color: INK, fontSize: 'inherit', lineHeight: 'inherit', textAlign: 'justify', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}><Runs runs={p} /></p>
      ))}

      <div className="il-block" style={{ marginTop: '14mm' }}>
        <div>{c.regards}</div>
        <div style={{ marginTop: '2mm', fontWeight: 700, color: NAVY }}>{c.forCompany}</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SIGNATURE_BASE64} alt="HR signature" style={{ width: '34mm', height: `${(34 * 41) / 98}mm`, marginTop: '2.5mm', display: 'block' }} />
        <div style={{ width: '43mm', marginTop: '1mm', borderBottom: `0.75pt solid ${INK}` }} />
        {c.signatory.name && <div style={{ marginTop: '2.5mm', fontWeight: 700 }}>{c.signatory.name}</div>}
        <div style={{ marginTop: c.signatory.name ? 0 : '2.5mm', fontWeight: 700 }}>{c.signatory.title}</div>
        <div style={{ color: '#666' }}>{c.signatory.subtitle}</div>
      </div>
    </div>
  );
}

/** A4 sheet for the screen preview (footer at the bottom of the sheet). */
export function InternshipLetterSheet({ content }: { content: InternshipLetterContent }) {
  return (
    <div className="il-sheet" style={{ position: 'relative', width: '210mm', minHeight: '297mm', boxSizing: 'border-box', padding: BRANDED_SHEET_PADDING, background: '#fff' }}>
      <InternshipLetterBody content={content} />
      <BrandedFooterHtml />
    </div>
  );
}

/**
 * Print view. @page has no margins (no browser header/footer); the table's
 * thead/tfoot spacers repeat on every printed page to keep text clear of the
 * page edge and of the fixed footer, which the browser repeats on every page.
 */
export const INTERNSHIP_PRINT_CSS = `
@media screen { #internship-print-root { display: none; } }
@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #fff !important; margin: 0 !important; }
  body > *:not(#internship-print-root) { display: none !important; }
  #internship-print-root { display: block !important; }
  #internship-print-root table.il-print { width: 100%; border-collapse: collapse; }
  #internship-print-root table.il-print td { padding: 0 20mm; }
  #internship-print-root .il-block, #internship-print-root p { break-inside: avoid; page-break-inside: avoid; }
}
`;

export function InternshipPrintRoot({ content }: { content: InternshipLetterContent | null }) {
  if (!content || typeof document === 'undefined') return null;
  return createPortal(
    <div id="internship-print-root" aria-hidden="true">
      <BrandedFooterHtml fixed />
      <table className="il-print">
        <thead><tr><td><div style={{ height: BRANDED_PRINT_SPACERS.top }} /></td></tr></thead>
        <tfoot><tr><td><div style={{ height: BRANDED_PRINT_SPACERS.bottom }} /></td></tr></tfoot>
        <tbody><tr><td><InternshipLetterBody content={content} /></td></tr></tbody>
      </table>
    </div>,
    document.body,
  );
}
