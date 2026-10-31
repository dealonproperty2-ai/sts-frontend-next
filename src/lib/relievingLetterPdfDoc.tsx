/**
 * Relieving Letter as a real, text-based A4 PDF (react-pdf).
 *
 * Header and footer are the shared STEP TO SOFT PVT. LTD. letterhead and
 * banded footer (brandedLetterPdfKit.tsx) — identical to the Internship
 * Experience Letter. The body follows the company's reference relieving
 * letter: underlined title, date, greeting, body, "Regards", signature and
 * signatory lines, in Times. Content comes from buildRelievingLetter() — the
 * same model the preview and print view render.
 *
 * Loaded ONLY through dynamic import() from relievingLetterPdf.ts.
 */
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { RelievingLetterContent } from '@/lib/relievingLetter';
import { COMPANY_NAME, SIGNATURE_BASE64 } from '@/lib/hrConstants';
import type { LetterRun } from '@/lib/appointmentLetter';
import { MM, noHyphenation } from '@/lib/hrLetterPdfKit';
import { BRANDED_PAGE_PADDING, BrandedFooter, BrandedHeader } from '@/lib/brandedLetterPdfKit';

export { docToBlob } from '@/lib/hrLetterPdfKit';

const INK = '#000000';

const s = StyleSheet.create({
  page: { ...BRANDED_PAGE_PADDING, fontFamily: 'Times-Roman', fontSize: 11.5, lineHeight: 1.36, color: INK },
  bold: { fontFamily: 'Times-Bold' },
  sup: { fontSize: 7.5, verticalAlign: 'super' },
  title: { marginTop: 7 * MM, textAlign: 'center', fontFamily: 'Times-Bold', textDecoration: 'underline' },
  date: { marginTop: 1.5 * MM, fontFamily: 'Times-Bold' },
  greeting: { marginTop: 5 * MM },
  para: { marginTop: 4.6 * MM, textAlign: 'justify' },
  paraFirst: { marginTop: 3.5 * MM },
  signBlock: { marginTop: 6 * MM },
  signature: { width: 39 * MM, height: (39 * MM * 41) / 98, marginTop: 6 * MM },
  customSignature: { width: 39 * MM, height: 18 * MM, marginTop: 5 * MM, objectFit: 'contain' },
  noSignature: { height: 18 * MM },
  signLines: { marginTop: 8 * MM },
});

/** Runs → nested <Text> (Times); superscripts are set smaller so they don't open up the line. */
function Runs({ runs }: { runs: LetterRun[] }) {
  return <>{runs.map((r, i) => <Text key={i} style={[r.bold ? s.bold : {}, r.sup ? s.sup : {}]}>{r.text}</Text>)}</>;
}

function Signature({ sig }: { sig: RelievingLetterContent['signature'] }) {
  /* eslint-disable jsx-a11y/alt-text -- react-pdf Image has no alt */
  if (sig.mode === 'none') return <View style={s.noSignature} />;
  if (sig.mode === 'custom' && sig.src) return <Image src={sig.src} style={s.customSignature} />;
  return <Image src={SIGNATURE_BASE64} style={s.signature} />;
  /* eslint-enable jsx-a11y/alt-text */
}

export function RelievingLetterDocument({ content }: { content: RelievingLetterContent }) {
  const c = content;
  return (
    <Document title={`Relieving Letter - ${c.employeeName}`} author={COMPANY_NAME} subject="Relieving Letter" creator={COMPANY_NAME} producer={COMPANY_NAME}>
      <Page size="A4" style={s.page}>
        <BrandedFooter />
        <BrandedHeader logo={c.logo} />

        <Text style={s.title}>{c.title}</Text>
        <Text style={s.date}>Date: {c.issueDate}</Text>
        <Text style={s.greeting} hyphenationCallback={noHyphenation}>{c.greeting}</Text>

        {c.paragraphs.map((p, i) => (
          <Text key={i} style={[s.para, i === 0 ? s.paraFirst : {}]} orphans={2} widows={2} hyphenationCallback={noHyphenation}>
            <Runs runs={p} />
          </Text>
        ))}

        {/* Regards, signature and signatory — kept together */}
        <View style={s.signBlock} wrap={false}>
          <Text>{c.regards}</Text>
          <Signature sig={c.signature} />
          <View style={s.signLines}>
            {c.signatory.name ? <Text>{c.signatory.name}</Text> : null}
            <Text>{c.signatory.company}</Text>
            <Text>{c.signatory.department}</Text>
            <Text>{c.signatory.title}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
