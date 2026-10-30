/**
 * Offer letter as a real, text-based A4 PDF (react-pdf).
 *
 * Shares the letterhead, footer, signatory block and page geometry with the
 * appointment letter (hrLetterPdfKit.tsx), so both HR letters look identical.
 * Content comes from buildOfferLetter() — the same model the on-screen preview
 * and print view render. Text stays selectable; pagination is real (headings
 * stay with their first lines, the compensation table, signatory and
 * acceptance blocks are never split).
 *
 * Loaded ONLY through dynamic import() from offerLetterPdf.ts.
 */
import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { OfferLetterContent } from '@/lib/offerLetter';
import { COMPANY_NAME } from '@/lib/hrConstants';
import {
  LetterFooter, Letterhead, MM, Runs, SignatoryBlock, letterStyles as s, noHyphenation,
} from '@/lib/hrLetterPdfKit';

export { docToBlob } from '@/lib/hrLetterPdfKit';

const o = StyleSheet.create({
  table: { marginTop: 3 * MM, borderWidth: 0.75, borderColor: '#555555' },
  row: { flexDirection: 'row', borderTopWidth: 0.75, borderTopColor: '#555555' },
  rowFirst: { flexDirection: 'row' },
  strongRow: { backgroundColor: '#F2F2F2' },
  cellLabel: { flex: 1, paddingVertical: 1.6 * MM, paddingHorizontal: 2.5 * MM },
  cellValue: { width: 45 * MM, paddingVertical: 1.6 * MM, paddingHorizontal: 2.5 * MM, textAlign: 'right', borderLeftWidth: 0.75, borderLeftColor: '#555555' },
  acceptanceHeading: { marginTop: 8.5 * MM, fontFamily: 'Times-Bold', textDecoration: 'underline' },
});

export function OfferLetterDocument({ content }: { content: OfferLetterContent }) {
  const c = content;
  return (
    <Document
      title={`Offer Letter - ${c.candidateName}`}
      author={COMPANY_NAME}
      subject="Offer Letter"
      creator={COMPANY_NAME}
      producer={COMPANY_NAME}
    >
      <Page size="A4" style={s.page}>
        <LetterFooter />
        <Letterhead />

        {/* Date and recipient */}
        <View style={s.recipient}>
          <Text>Date: {c.issueDate}</Text>
          <Text>{c.recipient.name}</Text>
          {c.recipient.addressLines.map((line, i) => <Text key={i}>{line}</Text>)}
          {c.recipient.email && <Text>Email: {c.recipient.email}</Text>}
          {c.recipient.phone && <Text>Phone: {c.recipient.phone}</Text>}
        </View>

        <Text style={s.title}>{c.title}</Text>
        <Text style={s.salutation} hyphenationCallback={noHyphenation}>{c.salutation}</Text>

        {c.sections.map((sec, i) => (
          <React.Fragment key={i}>
            <Text style={s.para} orphans={3} widows={2} hyphenationCallback={noHyphenation}>
              <Runs runs={sec.heading} />
              {'\n'}
              <Runs runs={sec.paragraphs[0]} />
            </Text>
            {sec.table && (
              <View style={o.table} wrap={false}>
                {sec.table.map((r, j) => (
                  <View key={j} style={[j === 0 ? o.rowFirst : o.row, r.strong ? o.strongRow : {}]}>
                    <Text style={[o.cellLabel, r.strong ? s.bold : {}]}>{r.label}</Text>
                    <Text style={[o.cellValue, r.strong ? s.bold : {}]}>{r.value}</Text>
                  </View>
                ))}
              </View>
            )}
            {sec.paragraphs.slice(1).map((p, j) => (
              <Text key={j} style={s.para} orphans={2} widows={2} hyphenationCallback={noHyphenation}><Runs runs={p} /></Text>
            ))}
          </React.Fragment>
        ))}

        {/* Closing and authorised signatory — kept together */}
        <View wrap={false}>
          <Text style={s.para}>{c.closing}</Text>
          <SignatoryBlock signOff={c.signOff} name={c.signatory.name} designation={c.signatory.designation} />
        </View>

        {/* Candidate acceptance — never split across pages */}
        <View wrap={false}>
          <Text style={o.acceptanceHeading}>{c.acceptanceHeading}</Text>
          <Text style={[s.para, { marginTop: 3 * MM }]} hyphenationCallback={noHyphenation}><Runs runs={c.acceptance} /></Text>
          <Text style={s.candidateSign}>Signature</Text>
          <View style={s.datePlace}>
            <Text>Date: {c.acceptanceDate || '____________________'}</Text>
            <Text hyphenationCallback={noHyphenation}>Place: {c.acceptancePlace || '___________________'}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
