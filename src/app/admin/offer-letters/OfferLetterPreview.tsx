'use client';

import { createPortal } from 'react-dom';
import type { LetterRun } from '@/lib/appointmentLetter';
import type { OfferLetterContent } from '@/lib/offerLetter';
import {
  COMPANY_ADDRESS, COMPANY_EMAIL, COMPANY_NAME, COMPANY_PHONE, COMPANY_WEBSITE, LOGO_MARK_BASE64, SIGNATURE_BASE64,
} from '@/lib/hrConstants';

/**
 * HTML rendering of an offer letter — the on-screen preview AND the print view.
 * Renders the same content model as the downloaded PDF (lib/offerLetterPdfDoc.tsx).
 */
function Runs({ runs }: { runs: LetterRun[] }) {
  return (
    <>
      {runs.map((r, i) => {
        let node: React.ReactNode = r.text;
        if (r.sup) node = <sup>{node}</sup>;
        if (r.underline) node = <u>{node}</u>;
        if (r.bold) node = <strong>{node}</strong>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

export function OfferLetterHtml({ content: c }: { content: OfferLetterContent }) {
  const para: React.CSSProperties = { marginTop: 14, textAlign: 'justify', whiteSpace: 'pre-line' };
  const link: React.CSSProperties = { color: '#0563C1', textDecoration: 'underline' };
  const cell: React.CSSProperties = { border: '1px solid #555', padding: '5px 9px' };

  return (
    <div className="ol-doc" style={{ position: 'relative', fontFamily: '"Times New Roman", Times, serif', background: '#fff', color: '#000', fontSize: 15, lineHeight: 1.2, width: '100%', maxWidth: 750, margin: '0 auto' }}>

      {/* Letterhead */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_MARK_BASE64} alt="" style={{ height: 60, width: 'auto', display: 'block' }} />
          <span style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 700, fontSize: 22, color: '#404040', letterSpacing: '0.02em', marginTop: 6 }}>TEP TO SOFT</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>{COMPANY_PHONE}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={link}>{COMPANY_EMAIL}</span></div>
          <div style={link}>{COMPANY_WEBSITE}</div>
        </div>
      </div>

      {/* Date and recipient */}
      <div style={{ marginTop: 36, fontSize: 14, overflowWrap: 'anywhere' }}>
        <div>Date: {c.issueDate}</div>
        <div>{c.recipient.name}</div>
        {c.recipient.addressLines.map((l, i) => <div key={i}>{l}</div>)}
        {c.recipient.email && <div>Email: {c.recipient.email}</div>}
        {c.recipient.phone && <div>Phone: {c.recipient.phone}</div>}
      </div>

      <div style={{ marginTop: 40, textAlign: 'center', fontWeight: 700, textDecoration: 'underline' }}>{c.title}</div>
      <div style={{ marginTop: 10, overflowWrap: 'anywhere' }}>{c.salutation}</div>

      {c.sections.map((sec, i) => (
        <div key={i} className="ol-section" style={{ marginTop: 14 }}>
          <div className="ol-heading"><Runs runs={sec.heading} /></div>
          <div style={{ textAlign: 'justify', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}><Runs runs={sec.paragraphs[0]} /></div>
          {sec.table && (
            <table className="ol-block no-min" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
              <tbody>
                {sec.table.map((r, j) => (
                  <tr key={j} style={{ background: r.strong ? '#f2f2f2' : undefined, fontWeight: r.strong ? 700 : undefined }}>
                    <td style={cell}>{r.label}</td>
                    <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap', width: '32%' }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {sec.paragraphs.slice(1).map((p, j) => <div key={j} style={para}><Runs runs={p} /></div>)}
        </div>
      ))}

      <div className="ol-block">
        <div style={para}>{c.closing}</div>
        <div style={{ marginTop: 14 }}>
          <div>{c.signOff}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SIGNATURE_BASE64} alt="HR signature" style={{ height: 40, width: 'auto', display: 'block', margin: '6px 0 3px' }} />
          <div>({c.signatory.name})</div>
          <div style={{ marginLeft: 55 }}>{c.signatory.designation}</div>
        </div>
      </div>

      <div className="ol-block">
        <div style={{ marginTop: 26, fontWeight: 700, textDecoration: 'underline' }}>{c.acceptanceHeading}</div>
        <div style={{ ...para, marginTop: 10 }}><Runs runs={c.acceptance} /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 44 }}>
          <div style={{ width: 170, borderTop: '1px solid #000', paddingTop: 4, textAlign: 'center' }}>Signature</div>
        </div>
        <div style={{ marginTop: 18, overflowWrap: 'anywhere' }}>
          <div>Date: {c.acceptanceDate || '____________________'}</div>
          <div>Place: {c.acceptancePlace || '___________________'}</div>
        </div>
      </div>

      <div style={{ marginTop: 28, borderTop: '1px solid #bbb', paddingTop: 6, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 10, color: '#6b6b6b' }}>
        {COMPANY_NAME} &nbsp;·&nbsp; {COMPANY_ADDRESS}
      </div>
    </div>
  );
}

/**
 * Print-only copy of the letter, portalled to be a DIRECT child of <body> so
 * the print stylesheet can hide everything else without hiding this too.
 */
export const OFFER_PRINT_CSS = `
@media screen { #offer-print-root { display: none; } }
@media print {
  @page { size: A4; margin: 16mm 18mm 18mm 18mm; }
  html, body { background: #fff !important; }
  body > *:not(#offer-print-root) { display: none !important; }
  #offer-print-root { display: block !important; }
  #offer-print-root .ol-doc { max-width: none !important; font-size: 12pt !important; }
  #offer-print-root .ol-block, #offer-print-root table { break-inside: avoid; page-break-inside: avoid; }
  #offer-print-root .ol-heading { break-after: avoid; page-break-after: avoid; }}
`;

export function OfferPrintRoot({ content }: { content: OfferLetterContent | null }) {
  if (!content || typeof document === 'undefined') return null;
  return createPortal(
    <div id="offer-print-root" aria-hidden="true">
      <OfferLetterHtml content={content} />
    </div>,
    document.body,
  );
}
