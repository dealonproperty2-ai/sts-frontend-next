/**
 * Appointment letter as a real, text-based A4 PDF (react-pdf).
 *
 * Layout reproduces the company's reference letter: logo top-left and contact
 * details top-right on the first page, a left-aligned date / recipient block,
 * a centred underlined title, justified 12 pt Times body text, numbered terms
 * with bold upper-case headings, the HR signatory block and the candidate's
 * acceptance statement. Geometry (margins, sizes, spacing) was measured from
 * the reference PDF's text layer.
 *
 * Text stays selectable/searchable and pagination is real: headings never sit
 * alone at a page bottom, and the signature and acceptance blocks are never
 * split. Content comes from buildAppointmentLetter() — the same model the
 * on-screen preview renders.
 *
 * Loaded ONLY through dynamic import() from appointmentLetterPdf.ts, so the
 * heavy renderer stays out of the admin bundle.
 */
import React from 'react';
import { Document, Image, Link, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { AppointmentLetterContent, LetterRun } from '@/lib/appointmentLetter';
import {
  COMPANY_ADDRESS, COMPANY_EMAIL, COMPANY_NAME, COMPANY_PHONE, COMPANY_WEBSITE,
  LOGO_MARK_BASE64, SIGNATURE_BASE64,
} from '@/lib/hrConstants';

const MM = 72 / 25.4;
const INK = '#000000';
const LINK = '#0563C1';
const MUTED = '#6B6B6B';

const s = StyleSheet.create({
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

/** Runs → nested <Text>; bold/underline/superscript per run. */
function Runs({ runs }: { runs: LetterRun[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text key={i} style={[r.bold ? s.bold : {}, r.underline ? s.underline : {}, r.sup ? s.sup : {}]}>{r.text}</Text>
      ))}
    </>
  );
}

/** Never hyphenate (names, addresses and legal wording must stay whole), like the reference. */
const noHyphenation = (word: string) => [word];

const websiteHref = (w: string) => (/^https?:\/\//.test(w) ? w : `https://${w}`);

export function AppointmentLetterDocument({ content }: { content: AppointmentLetterContent }) {
  const c = content;
  return (
    <Document
      title={`Appointment Letter - ${c.candidateName}`}
      author={COMPANY_NAME}
      subject="Appointment Letter"
      creator={COMPANY_NAME}
      producer={COMPANY_NAME}
    >
      <Page size="A4" style={s.page}>
        {/* Footer on every page. Deliberately static: in this react-pdf version a
            `render`-prop Text (dynamic page numbers) is never drawn and collapses
            its fixed container, which made the whole footer disappear. */}
        <View style={s.footer} fixed>
          <View style={s.footerRule} />
          <Text style={s.footerText}>{`${COMPANY_NAME}  ·  ${COMPANY_ADDRESS}`}</Text>
        </View>
        {/* Letterhead */}
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

        {/* Date and recipient */}
        <View style={s.recipient}>
          <Text>Date: {c.issueDate}</Text>
          <Text>{c.recipient.name}</Text>
          {c.recipient.addressLines.map((line, i) => <Text key={i}>{line}</Text>)}
          {c.recipient.email && <Text>Email:{c.recipient.email}</Text>}
          {c.recipient.phone && <Text>Cell: {c.recipient.phone}</Text>}
        </View>

        <Text style={s.title}>{c.title}</Text>
        <Text style={s.salutation}>{c.salutation}</Text>
        <Text style={s.para} hyphenationCallback={noHyphenation}><Runs runs={c.opening} /></Text>

        {/* Numbered clauses. The heading and the clause's first paragraph are
            ONE text block so the orphans rule keeps the heading with at least
            two body lines, while a long clause can still flow onto the next page. */}
        {c.clauses.map((cl, i) => (
          <React.Fragment key={i}>
            <Text style={s.para} orphans={3} widows={2} hyphenationCallback={noHyphenation}>
              <Runs runs={cl.heading} />
              {cl.gapAfterHeading ? '\n\n' : '\n'}
              <Runs runs={cl.paragraphs[0]} />
            </Text>
            {cl.paragraphs.slice(1).map((p, j) => (
              <Text key={j} style={s.para} orphans={2} widows={2} hyphenationCallback={noHyphenation}><Runs runs={p} /></Text>
            ))}
          </React.Fragment>
        ))}

        {/* Closing and HR signatory — kept together on one page */}
        <View wrap={false}>
          <Text style={s.thanking}>{c.thanking}</Text>
          <View style={s.signBlock}>
            <Text>{c.signOff}</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            <Image src={SIGNATURE_BASE64} style={s.signature} />
            <Text>({c.signatory.name})</Text>
            <Text style={s.signatoryDesignation}>{c.signatory.designation}</Text>
          </View>
        </View>

        {/* Employee acceptance — never split across pages. Date and place come
            from the letter's "Employee Acceptance Details"; when not entered, a
            fill-in line is left for the employee to complete by hand. */}
        <View wrap={false}>
          <Text style={s.acceptance} hyphenationCallback={noHyphenation}><Runs runs={c.acceptance} /></Text>
          <Text style={s.candidateSign}>Signature</Text>
          <View style={s.datePlace}>
            <Text>Date: {c.acceptanceDate || '____________________'}</Text>
            <Text>Place: {c.acceptancePlace || '___________________'}</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}

export async function docToBlob(element: React.ReactElement): Promise<Blob> {
  return pdf(element).toBlob();
}
