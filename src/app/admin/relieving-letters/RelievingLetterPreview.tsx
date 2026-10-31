'use client';

import { createPortal } from 'react-dom';
import type { LetterRun } from '@/lib/appointmentLetter';
import type { RelievingLetterContent } from '@/lib/relievingLetter';
import { SIGNATURE_BASE64 } from '@/lib/hrConstants';
import {
  BRANDED_PRINT_SPACERS, BRANDED_SHEET_PADDING, BrandedFooterHtml, BrandedHeaderHtml,
} from '@/components/letters/BrandedLetterChrome';

/**
 * HTML rendering of a relieving letter — the on-screen A4 preview AND the
 * print view. Same content model and the same millimetre geometry as the
 * downloaded PDF (lib/relievingLetterPdfDoc.tsx); header and footer are the
 * shared branded ones (identical to the Internship Experience Letter). Every
 * block sets its own colour/size so the admin theme never leaks into the letter.
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

function Signature({ sig }: { sig: RelievingLetterContent['signature'] }) {
  if (sig.mode === 'none') return <div style={{ height: '18mm' }} />;
  if (sig.mode === 'custom' && sig.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={sig.src} alt="Authorized signature" style={{ width: '39mm', height: '18mm', objectFit: 'contain', marginTop: '5mm', display: 'block' }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={SIGNATURE_BASE64} alt="HR signature" style={{ width: '39mm', height: `${(39 * 41) / 98}mm`, marginTop: '6mm', display: 'block' }} />;
}

/** The letter (letterhead → signatory), without page padding or footer. */
export function RelievingLetterBody({ content: c }: { content: RelievingLetterContent }) {
  return (
    <div style={{ color: INK }}>
      <BrandedHeaderHtml logo={c.logo} />
      <div style={{ fontFamily: FONT, fontSize: '11.5pt', lineHeight: 1.36, color: INK }}>
        <div style={{ marginTop: '7mm', textAlign: 'center', fontWeight: 700, textDecoration: 'underline' }}>{c.title}</div>
        <div style={{ marginTop: '1.5mm', fontWeight: 700 }}>Date: {c.issueDate}</div>
        <div style={{ marginTop: '5mm', overflowWrap: 'anywhere' }}>{c.greeting}</div>

        {c.paragraphs.map((p, i) => (
          <p key={i} style={{ margin: `${i === 0 ? 3.5 : 4.6}mm 0 0`, color: INK, fontSize: 'inherit', lineHeight: 'inherit', textAlign: 'justify', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
            <Runs runs={p} />
          </p>
        ))}

        <div className="rl-block" style={{ marginTop: '6mm' }}>
          <div>{c.regards}</div>
          <Signature sig={c.signature} />
          <div style={{ marginTop: '8mm' }}>
            {c.signatory.name && <div>{c.signatory.name}</div>}
            <div>{c.signatory.company}</div>
            <div>{c.signatory.department}</div>
            <div>{c.signatory.title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A4 sheet for the screen preview (footer at the bottom of the sheet). */
export function RelievingLetterSheet({ content }: { content: RelievingLetterContent }) {
  return (
    <div style={{ position: 'relative', width: '210mm', minHeight: '297mm', boxSizing: 'border-box', padding: BRANDED_SHEET_PADDING, background: '#fff', color: INK }}>
      <RelievingLetterBody content={content} />
      <BrandedFooterHtml />
    </div>
  );
}

/**
 * Print view. @page has no margins (no browser header/footer); the table's
 * thead/tfoot spacers repeat on every printed page to keep text clear of the
 * page edge and of the fixed footer, which the browser repeats on every page.
 */
export const RELIEVING_PRINT_CSS = `
@media screen { #relieving-print-root { display: none; } }
@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #fff !important; margin: 0 !important; }
  body > *:not(#relieving-print-root) { display: none !important; }
  #relieving-print-root { display: block !important; }
  #relieving-print-root table.rl-print { width: 100%; border-collapse: collapse; }
  #relieving-print-root table.rl-print td { padding: 0 ${BRANDED_PRINT_SPACERS.side}; }
  #relieving-print-root .rl-block, #relieving-print-root p { break-inside: avoid; page-break-inside: avoid; }
}
`;

export function RelievingPrintRoot({ content }: { content: RelievingLetterContent | null }) {
  if (!content || typeof document === 'undefined') return null;
  return createPortal(
    <div id="relieving-print-root" aria-hidden="true">
      <BrandedFooterHtml fixed />
      <table className="rl-print">
        <thead><tr><td><div style={{ height: BRANDED_PRINT_SPACERS.top }} /></td></tr></thead>
        <tfoot><tr><td><div style={{ height: BRANDED_PRINT_SPACERS.bottom }} /></td></tr></tfoot>
        <tbody><tr><td><RelievingLetterBody content={content} /></td></tr></tbody>
      </table>
    </div>,
    document.body,
  );
}
