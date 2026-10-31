/**
 * Internship Experience Letter as a real, text-based A4 PDF (react-pdf).
 *
 * Layout follows the company's reference letter (centred letter-spaced
 * letterhead with logo, navy rule, title, right-aligned date, "To whom it may
 * concern", justified body, signatory block, banded footer). Content comes from
 * buildInternshipLetter() — the same model the preview and print view render.
 * Text stays selectable; long letters paginate (footer on every page, the
 * signatory block is never split).
 *
 * Loaded ONLY through dynamic import() from internshipLetterPdf.ts.
 */
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { LetterRun } from '@/lib/appointmentLetter';
import type { InternshipLetterContent } from '@/lib/internshipLetter';
import { COMPANY_NAME, SIGNATURE_BASE64 } from '@/lib/hrConstants';
import { MM, noHyphenation } from '@/lib/hrLetterPdfKit';
import { BRAND_NAVY as NAVY, BRANDED_PAGE_PADDING, BrandedFooter, BrandedHeader } from '@/lib/brandedLetterPdfKit';

export { docToBlob } from '@/lib/hrLetterPdfKit';

const INK = '#222222';
/** Short dashed rule under the title, as in the reference. */
const DASHES = '_ _ _ _ _ _ _ _ _';

const s = StyleSheet.create({
  page: { ...BRANDED_PAGE_PADDING, fontFamily: 'Helvetica', fontSize: 10.5, lineHeight: 1.47, color: INK },
  bold: { fontFamily: 'Helvetica-Bold' },

  title: { marginTop: 7 * MM, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 13, letterSpacing: 2.1, color: NAVY },
  dashes: { marginTop: -0.5 * MM, textAlign: 'center', fontSize: 8, letterSpacing: 1.2, color: NAVY, lineHeight: 1 },
  dateRow: { marginTop: 6 * MM, flexDirection: 'row', justifyContent: 'flex-end' },
  dateLabel: { fontFamily: 'Helvetica-Bold', color: NAVY },
  subject: { marginTop: 6 * MM, textAlign: 'center', fontFamily: 'Helvetica-Bold', textDecoration: 'underline' },

  para: { marginTop: 3.6 * MM, textAlign: 'justify', paddingRight: 4 * MM },
  paraFirst: { marginTop: 3 * MM },

  signBlock: { marginTop: 14 * MM },
  forCompany: { marginTop: 2 * MM, fontFamily: 'Helvetica-Bold', color: NAVY },
  signature: { width: 34 * MM, height: (34 * MM * 41) / 98, marginTop: 2.5 * MM },
  signRule: { width: 43 * MM, marginTop: 1 * MM, borderBottomWidth: 0.75, borderBottomColor: INK },
  signName: { marginTop: 2.5 * MM, fontFamily: 'Helvetica-Bold' },
  signTitle: { marginTop: 2.5 * MM, fontFamily: 'Helvetica-Bold' },
  signTitleAfterName: { marginTop: 0 },
  signSubtitle: { color: '#666666' },
});

function Runs({ runs }: { runs: LetterRun[] }) {
  return <>{runs.map((r, i) => <Text key={i} style={r.bold ? s.bold : {}}>{r.text}</Text>)}</>;
}

export function InternshipLetterDocument({ content }: { content: InternshipLetterContent }) {
  const c = content;
  return (
    <Document title={`Internship Experience Letter - ${c.internName}`} author={COMPANY_NAME} subject="Internship Experience Letter" creator={COMPANY_NAME} producer={COMPANY_NAME}>
      <Page size="A4" style={s.page}>
        <BrandedFooter />
        <BrandedHeader logo={c.logo} />

        <Text style={s.title}>{c.title}</Text>
        <Text style={s.dashes}>{DASHES}</Text>
        <View style={s.dateRow}>
          <Text><Text style={s.dateLabel}>Date:</Text>{` ${c.letterDate}`}</Text>
        </View>
        <Text style={s.subject}>{c.subject}</Text>

        {c.paragraphs.map((p, i) => (
          <Text key={i} style={[s.para, i === 0 ? s.paraFirst : {}]} orphans={2} widows={2} hyphenationCallback={noHyphenation}>
            <Runs runs={p} />
          </Text>
        ))}

        {/* Regards and signatory — kept together */}
        <View style={s.signBlock} wrap={false}>
          <Text>{c.regards}</Text>
          <Text style={s.forCompany}>{c.forCompany}</Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image src={SIGNATURE_BASE64} style={s.signature} />
          <View style={s.signRule} />
          {c.signatory.name ? <Text style={s.signName}>{c.signatory.name}</Text> : null}
          <Text style={[s.signTitle, c.signatory.name ? s.signTitleAfterName : {}]}>{c.signatory.title}</Text>
          <Text style={s.signSubtitle}>{c.signatory.subtitle}</Text>
        </View>
      </Page>
    </Document>
  );
}
