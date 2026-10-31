/**
 * Shared STEP TO SOFT PVT. LTD. letterhead and footer for the branded HR
 * letters (Internship Experience Letter, Relieving Letter), rendered with
 * react-pdf: logo on the left, centred letter-spaced company name with address
 * and contact lines, navy rule; banded navy/grey footer on every page.
 *
 * One implementation so the letters always carry identical branding. Fonts and
 * colours are set explicitly here, so the header/footer look the same whatever
 * font the letter body uses. Pages using it must use BRANDED_PAGE_PADDING.
 *
 * Imports `@react-pdf/renderer` — load ONLY through dynamic import().
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from '@react-pdf/renderer';
import { BRAND } from '@/lib/internshipLetter';
import { LOGO_MARK_BASE64 } from '@/lib/hrConstants';
import { MM } from '@/lib/hrLetterPdfKit';

export const BRAND_NAVY = '#1F3A5F';
const INK = '#222222';
const MUTED = '#555555';

/** Page padding the header/footer geometry is built for (footer sits in the bottom padding). */
export const BRANDED_PAGE_PADDING = { paddingTop: 11 * MM, paddingBottom: 27 * MM, paddingLeft: 20 * MM, paddingRight: 20 * MM };

export type BrandedLogo = { mode: 'default' | 'custom' | 'none'; src: string | null };

const s = StyleSheet.create({
  head: { position: 'relative', minHeight: 20 * MM, fontFamily: 'Helvetica', color: INK },
  logoBox: { position: 'absolute', left: 0, top: 0.5 * MM, flexDirection: 'row', alignItems: 'center' },
  mark: { width: 8.4 * MM, height: 11.3 * MM },
  wordmark: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: '#404040', marginLeft: 0.4 * MM, marginTop: 1.2 * MM, letterSpacing: 0.2, lineHeight: 1.47 },
  customLogo: { width: 32 * MM, height: 13 * MM, objectFit: 'contain' },
  headText: { alignItems: 'center', paddingHorizontal: 34 * MM },
  company: { fontFamily: 'Helvetica-Bold', fontSize: 13.5, letterSpacing: 1.9, color: BRAND_NAVY, lineHeight: 1.2 },
  headLine: { fontFamily: 'Helvetica', fontSize: 8, color: MUTED, lineHeight: 1.35, textAlign: 'center' },
  headFirst: { marginTop: 2 * MM },
  rule: { marginTop: 2.8 * MM, height: 1.8, backgroundColor: BRAND_NAVY },

  footer: { position: 'absolute', left: 20 * MM, right: 20 * MM, bottom: 7.7 * MM, fontFamily: 'Helvetica' },
  footerRule: { height: 1, backgroundColor: BRAND_NAVY },
  footerBand: { backgroundColor: '#EFEFEF', paddingVertical: 1.6 * MM, paddingHorizontal: 3 * MM },
  footerName: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: BRAND_NAVY, textAlign: 'center', letterSpacing: 0.3, lineHeight: 1.3 },
  footerText: { fontFamily: 'Helvetica', fontSize: 7, color: MUTED, textAlign: 'center', lineHeight: 1.3 },
});

const contactLine = `Email: ${BRAND.email}   |   Website: ${BRAND.website}`;

/** Footer on every page (static — see hrLetterPdfKit LetterFooter). Must be the FIRST child of <Page>. */
export function BrandedFooter() {
  return (
    <View style={s.footer} fixed>
      <View style={s.footerRule} />
      <View style={s.footerBand}>
        <Text style={s.footerName}>{BRAND.name}</Text>
        <Text style={s.footerText}>{BRAND.address}</Text>
        <Text style={s.footerText}>{contactLine}</Text>
      </View>
    </View>
  );
}

function Logo({ logo }: { logo: BrandedLogo }) {
  if (logo.mode === 'none') return null;
  return (
    <View style={s.logoBox}>
      {/* eslint-disable jsx-a11y/alt-text -- react-pdf Image has no alt */}
      {logo.mode === 'custom' && logo.src ? (
        <Image src={logo.src} style={s.customLogo} />
      ) : (
        <>
          <Image src={LOGO_MARK_BASE64} style={s.mark} />
          <Text style={s.wordmark}>TEP TO SOFT</Text>
        </>
      )}
      {/* eslint-enable jsx-a11y/alt-text */}
    </View>
  );
}

/** Letterhead (first page) followed by the navy rule. */
export function BrandedHeader({ logo }: { logo: BrandedLogo }) {
  return (
    <>
      <View style={s.head}>
        <Logo logo={logo} />
        <View style={s.headText}>
          <Text style={s.company}>{BRAND.name}</Text>
          <Text style={[s.headLine, s.headFirst]}>{BRAND.addressLine1}</Text>
          <Text style={s.headLine}>{BRAND.addressLine2}</Text>
          <Text style={s.headLine}>{contactLine}</Text>
        </View>
      </View>
      <View style={s.rule} />
    </>
  );
}
