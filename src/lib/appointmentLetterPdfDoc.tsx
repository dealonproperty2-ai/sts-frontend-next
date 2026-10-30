/**
 * Appointment letter as a real, text-based A4 PDF (react-pdf).
 *
 * Layout reproduces the company's reference letter: logo top-left and contact
 * details top-right on the first page, a left-aligned date / recipient block,
 * a centred underlined title, justified 12 pt Times body text, numbered terms
 * with bold upper-case headings, the HR signatory block and the candidate's
 * acceptance statement. Letterhead, footer, signatory and page geometry are
 * shared with the other HR letters (hrLetterPdfKit.tsx).
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
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { AppointmentLetterContent } from '@/lib/appointmentLetter';
import { COMPANY_NAME } from '@/lib/hrConstants';
import {
  LetterFooter, Letterhead, Runs, SignatoryBlock, letterStyles as s, noHyphenation,
} from '@/lib/hrLetterPdfKit';

export { docToBlob } from '@/lib/hrLetterPdfKit';

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
        <LetterFooter />
        <Letterhead />

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
          <SignatoryBlock signOff={c.signOff} name={c.signatory.name} designation={c.signatory.designation} />
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
