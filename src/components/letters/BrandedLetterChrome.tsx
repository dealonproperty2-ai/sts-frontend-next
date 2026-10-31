'use client';

import { BRAND } from '@/lib/internshipLetter';
import { LOGO_MARK_BASE64 } from '@/lib/hrConstants';

/**
 * HTML twin of lib/brandedLetterPdfKit.tsx: the shared STEP TO SOFT PVT. LTD.
 * letterhead and banded footer used by the Internship Experience Letter and
 * the Relieving Letter previews/print views. Same millimetre geometry as the
 * PDF; fonts and colours are explicit so the letter body's font (and the admin
 * theme) never change the branding. Pages use BRANDED_SHEET_PADDING.
 */
export const BRAND_NAVY = '#1F3A5F';
const INK = '#222';
const MUTED = '#555';
const SANS = 'Helvetica, Arial, sans-serif';

/** Sheet padding the header/footer geometry is built for (footer sits in the bottom padding). */
export const BRANDED_SHEET_PADDING = '11mm 20mm 27mm';
export const BRANDED_PRINT_SPACERS = { top: '11mm', bottom: '27mm', side: '20mm' };

export type BrandedLogoHtml = { mode: 'default' | 'custom' | 'none'; src: string | null };

const contact = <>Email: {BRAND.email}&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;Website: {BRAND.website}</>;

function Logo({ logo }: { logo: BrandedLogoHtml }) {
  if (logo.mode === 'none') return null;
  return (
    <div style={{ position: 'absolute', left: 0, top: '0.5mm', display: 'flex', alignItems: 'center' }}>
      {logo.mode === 'custom' && logo.src ? (
        // Same box as the PDF: scaled to fit 32 × 13 mm, centred.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo.src} alt="Company logo" style={{ width: '32mm', height: '13mm', objectFit: 'contain', display: 'block' }} />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_MARK_BASE64} alt="" style={{ width: '8.4mm', height: '11.3mm', display: 'block' }} />
          <span style={{ fontWeight: 700, fontSize: '10.5pt', color: '#404040', marginLeft: '0.4mm', marginTop: '1.2mm', letterSpacing: '0.2pt' }}>TEP TO SOFT</span>
        </>
      )}
    </div>
  );
}

/** Letterhead (first page) followed by the navy rule. */
export function BrandedHeaderHtml({ logo }: { logo: BrandedLogoHtml }) {
  return (
    <div style={{ fontFamily: SANS, color: INK, lineHeight: 1.47 }}>
      <div style={{ position: 'relative', minHeight: '20mm' }}>
        <Logo logo={logo} />
        <div style={{ textAlign: 'center', padding: '0 34mm' }}>
          <div style={{ fontWeight: 700, fontSize: '13.5pt', letterSpacing: '1.9pt', color: BRAND_NAVY, lineHeight: 1.2 }}>{BRAND.name}</div>
          <div style={{ marginTop: '2mm', fontSize: '8pt', lineHeight: 1.35, color: MUTED }}>
            <div>{BRAND.addressLine1}</div>
            <div>{BRAND.addressLine2}</div>
            <div>{contact}</div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: '2.8mm', height: '1.8pt', background: BRAND_NAVY, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
    </div>
  );
}

/** Banded footer: absolute at the bottom of a screen sheet, or `fixed` (repeated on every printed page). */
export function BrandedFooterHtml({ fixed = false }: { fixed?: boolean }) {
  return (
    <div style={{ position: fixed ? 'fixed' : 'absolute', left: '20mm', right: '20mm', bottom: '7.7mm', fontFamily: SANS }}>
      <div style={{ height: 1, background: BRAND_NAVY }} />
      <div style={{ background: '#EFEFEF', padding: '1.6mm 3mm', textAlign: 'center', fontSize: '7pt', lineHeight: 1.3, color: MUTED, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div style={{ fontWeight: 700, color: BRAND_NAVY, letterSpacing: '0.3pt' }}>{BRAND.name}</div>
        <div>{BRAND.address}</div>
        <div>{contact}</div>
      </div>
    </div>
  );
}
