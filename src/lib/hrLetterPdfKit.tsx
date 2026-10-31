/**
 * Shared building blocks for the company's text-based HR letter PDFs
 * (appointment letters and offer letters), rendered with react-pdf.
 *
 * One implementation of the letterhead, footer, signatory block, run renderer
 * and page geometry, so every HR letter looks the same and fixes land once.
 * Geometry (margins, sizes, spacing) was measured from the company's reference
 * appointment letter.
 *
 * Imports the heavy `@react-pdf/renderer` at the top level — load this module
 * (and the documents that use it) ONLY through dynamic import().
 */
import React from 'react';
import { Image, Link, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { LetterRun } from '@/lib/appointmentLetter';
import {
  COMPANY_ADDRESS, COMPANY_EMAIL, COMPANY_NAME, COMPANY_PHONE, COMPANY_WEBSITE,
  LOGO_MARK_BASE64, SIGNATURE_BASE64,
} from '@/lib/hrConstants';

export const MM = 72 / 25.4;
const INK = '#000000';
const LINK = '#0563C1';
const MUTED = '#6B6B6B';

export const letterStyles = StyleSheet.create({
  page: {
    paddingTop: 22 * MM,
    paddingBottom: 24 * MM,
    paddingLeft: 18 * MM,
    paddingRight: 19.5 * MM,
    fontFamily: 'Times-Roman',
    fontSize: 12,
    lineHeight: 1.15,
    color: INK,
  },
  bold: { fontFamily: 'Times-Bold' },
  underline: { textDecoration: 'underline' },

  // Letterhead (first page only)
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  lockup: { flexDirection: 'row', alignItems: 'center' },
  mark: { width: 12.2 * MM, height: 16.5 * MM },
  wordmark: { fontFamily: 'Helvetica-Bold', fontSize: 17, color: '#404040', marginLeft: 0.6 * MM, marginTop: 1.6 * MM, letterSpacing: 0.3 },
  contact: { alignItems: 'flex-end', marginTop: 1 * MM },
  contactRow: { flexDirection: 'row' },
  link: { color: LINK, textDecoration: 'underline' },

  // Date / recipient (11 pt in the reference)
  recipient: { marginTop: 11 * MM, fontSize: 11 },

  title: { marginTop: 13 * MM, textAlign: 'center', fontFamily: 'Times-Bold', textDecoration: 'underline' },
  salutation: { marginTop: 3 * MM },
  // Paragraphs are separated by one blank line, as in the reference.
  para: { marginTop: 5 * MM, textAlign: 'justify' },
  sup: { verticalAlign: 'super' },

  thanking: { marginTop: 3 * MM },
  signBlock: { marginTop: 5 * MM },
  signature: { width: 26 * MM, height: (26 * MM * 41) / 98, marginTop: 2 * MM, marginBottom: 1 * MM },
  signatoryDesignation: { marginLeft: 14.6 * MM },

  acceptance: { marginTop: 8.5 * MM, textAlign: 'justify' },
  candidateSign: { alignSelf: 'flex-end', width: 45 * MM, marginTop: 16 * MM, borderTopWidth: 1, borderTopColor: INK, paddingTop: 1.5 * MM, textAlign: 'center' },
  datePlace: { marginTop: 5 * MM },

  footer: { position: 'absolute', left: 18 * MM, right: 19.5 * MM, bottom: 10 * MM },
  footerRule: { height: 0.5, backgroundColor: '#BBBBBB', marginBottom: 2 * MM },
  footerText: { fontFamily: 'Helvetica', fontSize: 7.5, color: MUTED, lineHeight: 1.2, textAlign: 'center' },
});

const s = letterStyles;

/** Runs → nested <Text>; bold/underline/superscript per run. */
export function Runs({ runs }: { runs: LetterRun[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text key={i} style={[r.bold ? s.bold : {}, r.underline ? s.underline : {}, r.sup ? s.sup : {}]}>{r.text}</Text>
      ))}
    </>
  );
}

/** Never hyphenate (names, addresses and legal wording must stay whole), like the reference. */
export const noHyphenation = (word: string) => [word];

const websiteHref = (w: string) => (/^https?:\/\//.test(w) ? w : `https://${w}`);

/**
 * Footer on every page. Deliberately static: in this react-pdf version a
 * `render`-prop Text (dynamic page numbers) is never drawn and collapses its
 * fixed container, which made the whole footer disappear.
 * Must be the FIRST child of <Page>.
 */
export function LetterFooter() {
  return (
    <View style={s.footer} fixed>
      <View style={s.footerRule} />
      <Text style={s.footerText}>{`${COMPANY_NAME}  ·  ${COMPANY_ADDRESS}`}</Text>
    </View>
  );
}

/** Company logo lockup (left) and contact details (right), from the verified company configuration. */
export function Letterhead() {
  return (
    <View style={s.head}>
      <View style={s.lockup}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
        <Image src={LOGO_MARK_BASE64} style={s.mark} />
        <Text style={s.wordmark}>TEP TO SOFT</Text>
      </View>
      <View style={s.contact}>
        <View style={s.contactRow}>
          <Text>{COMPANY_PHONE}{'      '}</Text>
          <Link src={`mailto:${COMPANY_EMAIL}`} style={s.link}>{COMPANY_EMAIL}</Link>
        </View>
        <Link src={websiteHref(COMPANY_WEBSITE)} style={s.link}>{COMPANY_WEBSITE}</Link>
      </View>
    </View>
  );
}

/** Sign-off line, the genuine HR signature image, "(Name)" and designation. */
export function SignatoryBlock({ signOff, name, designation }: { signOff: string; name: string; designation: string }) {
  return (
    <View style={s.signBlock}>
      <Text>{signOff}</Text>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
      <Image src={SIGNATURE_BASE64} style={s.signature} />
      <Text>({name})</Text>
      <Text style={s.signatoryDesignation}>{designation}</Text>
    </View>
  );
}

export async function docToBlob(element: React.ReactElement): Promise<Blob> {
  return pdf(element).toBlob();
}
