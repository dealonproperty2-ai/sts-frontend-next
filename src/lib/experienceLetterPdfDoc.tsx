/**
 * Experience Letter as a real, text-based A4 PDF (react-pdf).
 *
 * Header and footer are the shared STEP TO SOFT PVT. LTD. letterhead and
 * banded footer (brandedLetterPdfKit.tsx) — identical to the Internship
 * Experience and Relieving letters. The body follows the company's reference
 * experience letter in Times: underlined "To whom it may concern", date, a
 * first-line-indented certification paragraph with the closing wish directly
 * below it, "Regards", signature and signatory lines. Content comes from
 * buildExperienceLetter() — the same model the preview and print view render.
 *
 * Loaded ONLY through dynamic import() from experienceLetterPdf.ts.
 */
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ExperienceLetterContent } from '@/lib/experienceLetter';
import { COMPANY_NAME, SIGNATURE_BASE64 } from '@/lib/hrConstants';
import type { LetterRun } from '@/lib/appointmentLetter';
import { MM, noHyphenation } from '@/lib/hrLetterPdfKit';
import { BRANDED_PAGE_PADDING, BrandedFooter, BrandedHeader } from '@/lib/brandedLetterPdfKit';

export { docToBlob } from '@/lib/hrLetterPdfKit';

const s = StyleSheet.create({
  page: { ...BRANDED_PAGE_PADDING, fontFamily: 'Times-Roman', fontSize: 11.5, lineHeight: 1.36, color: '#000000' },
  bold: { fontFamily: 'Times-Bold' },
  sup: { fontSize: 7.5, verticalAlign: 'super' },
  title: { marginTop: 7 * MM, textAlign: 'center', textDecoration: 'underline' },
  date: { marginTop: 6 * MM },
  indent: { textIndent: 15 * MM },
  intro: { marginTop: 6 * MM, textAlign: 'justify' },
  remarks: { marginTop: 3 * MM, textAlign: 'justify' },
  closing: { textAlign: 'justify' },
  closingAfterRemarks: { marginTop: 3 * MM },
  signBlock: { marginTop: 7 * MM },
  signature: { width: 39 * MM, height: (39 * MM * 41) / 98, marginTop: 5 * MM },
  customSignature: { width: 39 * MM, height: 18 * MM, marginTop: 4 * MM, objectFit: 'contain' },
  noSignature: { height: 18 * MM },
  signCompany: { marginTop: 5 * MM },
  signLines: { marginTop: 5 * MM },
});

/**
 * Runs → nested <Text> (Times); superscripts set smaller so they don't open up the line.
 * react-pdf reads a paragraph's first-line indent from its FIRST run (not inherited from
 * the parent), so `indent` is applied there.
 */
function Runs({ runs, indent }: { runs: LetterRun[]; indent?: boolean }) {
  return <>{runs.map((r, i) => <Text key={i} style={[r.bold ? s.bold : {}, r.sup ? s.sup : {}, indent && i === 0 ? s.indent : {}]}>{r.text}</Text>)}</>;
}

function Signature({ sig }: { sig: ExperienceLetterContent['signature'] }) {
  /* eslint-disable jsx-a11y/alt-text -- react-pdf Image has no alt */
  if (sig.mode === 'none') return <View style={s.noSignature} />;
  if (sig.mode === 'custom' && sig.src) return <Image src={sig.src} style={s.customSignature} />;
  return <Image src={SIGNATURE_BASE64} style={s.signature} />;
  /* eslint-enable jsx-a11y/alt-text */
}

export function ExperienceLetterDocument({ content }: { content: ExperienceLetterContent }) {
  const c = content;
  return (
    <Document title={`Experience Letter - ${c.employeeName}`} author={COMPANY_NAME} subject="Experience Letter" creator={COMPANY_NAME} producer={COMPANY_NAME}>
      <Page size="A4" style={s.page}>
        <BrandedFooter />
        <BrandedHeader logo={c.logo} />

        <Text style={s.title}>{c.title}</Text>
        <Text style={s.date}>Date: {c.issueDate}</Text>

        <Text style={s.intro} orphans={2} widows={2} hyphenationCallback={noHyphenation}><Runs runs={c.intro} indent /></Text>
        {c.remarks && <Text style={s.remarks} orphans={2} widows={2} hyphenationCallback={noHyphenation}><Runs runs={c.remarks} indent /></Text>}
        <Text style={[s.closing, c.remarks ? s.closingAfterRemarks : {}]} hyphenationCallback={noHyphenation}><Runs runs={c.closing} /></Text>

        {/* Regards, signature and signatory — kept together */}
        <View style={s.signBlock} wrap={false}>
          <Text>{c.regards}</Text>
          <Signature sig={c.signature} />
          {c.signatory.name ? <Text style={s.signCompany}>{c.signatory.name}</Text> : null}
          <Text style={c.signatory.name ? {} : s.signCompany}>{c.signatory.company}</Text>
          <View style={s.signLines}>
            <Text>{c.signatory.department}</Text>
            <Text>{c.signatory.title}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
