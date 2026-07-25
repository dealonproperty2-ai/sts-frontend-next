/**
 * react-pdf documents for the Active Resource module.
 *
 * This module imports the heavy `@react-pdf/renderer` at the top level, so it is
 * ONLY ever loaded through a dynamic import() from resourcePdf.ts — keeping the
 * ~500 kB renderer out of the main admin bundle. Everything here is text-based
 * (built-in Helvetica, no remote fonts, no images) so the output is fully
 * ATS-parseable and never blocks on an authenticated /file fetch.
 */
import {
  Document, Page, Text, View, StyleSheet, pdf,
} from '@react-pdf/renderer';
import type { AdminResource } from '@/lib/adminApi';

const BLUE = '#2D36D9';
const ORANGE = '#F58220';
const INK = '#1A1D2E';
const MUTED = '#5B6070';
const LINE = '#E3E5EE';

const AVAILABILITY_LABEL: Record<string, string> = {
  available: 'Available',
  on_project: 'On Project',
  reserved: 'Reserved',
  interview_scheduled: 'Interview Scheduled',
  joining_soon: 'Joining Soon',
  on_leave: 'On Leave',
  inactive: 'Inactive',
};

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 48, paddingHorizontal: 44, fontFamily: 'Helvetica', fontSize: 10, color: INK, lineHeight: 1.5 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  brand: { fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, color: BLUE },
  brandSub: { fontSize: 7.5, color: MUTED, letterSpacing: 0.5 },
  badge: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 3 },
  name: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: INK, marginTop: 10 },
  role: { fontSize: 12, color: ORANGE, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 4 },
  metaItem: { fontSize: 8.5, color: MUTED, marginRight: 14 },
  metaStrong: { color: INK, fontFamily: 'Helvetica-Bold' },
  rule: { borderBottomWidth: 1.5, borderBottomColor: BLUE, marginTop: 14, marginBottom: 4 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7, borderBottomWidth: 0.75, borderBottomColor: LINE, paddingBottom: 3 },
  summary: { fontSize: 10, color: '#2C3040', lineHeight: 1.6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: { fontSize: 8.5, color: BLUE, backgroundColor: '#EEF0FE', borderRadius: 3, paddingVertical: 2.5, paddingHorizontal: 7, marginRight: 5, marginBottom: 5 },
  item: { marginBottom: 10 },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between' },
  itemTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: INK },
  itemSub: { fontSize: 9, color: ORANGE, fontFamily: 'Helvetica-Bold' },
  itemMeta: { fontSize: 8.5, color: MUTED },
  itemDesc: { fontSize: 9.5, color: '#2C3040', marginTop: 2 },
  bullet: { flexDirection: 'row', marginTop: 2 },
  bulletDot: { width: 10, fontSize: 9.5, color: BLUE },
  bulletText: { flex: 1, fontSize: 9.5, color: '#2C3040' },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap' },
  half: { width: '50%', paddingRight: 12, marginBottom: 8 },
  kvLabel: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  kvValue: { fontSize: 10, color: INK, marginTop: 1 },
  footer: { position: 'absolute', bottom: 24, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.75, borderTopColor: LINE, paddingTop: 6 },
  footerText: { fontSize: 7.5, color: MUTED },
  // Client submission
  coverTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: INK, marginTop: 8 },
  coverMsg: { fontSize: 10, color: '#2C3040', marginTop: 12, lineHeight: 1.6 },
  card: { borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 12, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  scorePill: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: BLUE, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 9 },
});

function fmtDate(v?: string) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function availColor(status: string) {
  switch (status) {
    case 'available': return '#16A34A';
    case 'on_project': return '#DC2626';
    case 'reserved': return BLUE;
    case 'interview_scheduled': return ORANGE;
    case 'joining_soon': return '#7C3AED';
    default: return MUTED;
  }
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Step To Soft Pvt. Ltd. — Confidential candidate profile</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

/** Full one-candidate professional profile. */
function CandidateProfile({ r }: { r: AdminResource }) {
  const links = [r.portfolioUrl, r.linkedinUrl, r.githubUrl].filter(Boolean);
  return (
    <Page size="A4" style={s.page}>
      <View style={s.brandRow}>
        <View>
          <Text style={s.brand}>STEP TO SOFT PVT. LTD.</Text>
          <Text style={s.brandSub}>Talent Profile</Text>
        </View>
        <Text style={[s.badge, { backgroundColor: availColor(r.availabilityStatus) }]}>
          {AVAILABILITY_LABEL[r.availabilityStatus] ?? r.availabilityStatus}
        </Text>
      </View>

      <Text style={s.name}>{r.fullName}</Text>
      {!!r.designation && <Text style={s.role}>{r.designation}</Text>}

      <View style={s.metaRow}>
        {r.experienceYears > 0 && <Text style={s.metaItem}><Text style={s.metaStrong}>{r.experienceYears}y</Text> experience</Text>}
        {!!r.location && <Text style={s.metaItem}>{r.location}</Text>}
        {!!r.timeZone && <Text style={s.metaItem}>{r.timeZone}</Text>}
        {!!r.noticePeriod && <Text style={s.metaItem}>Notice: {r.noticePeriod}</Text>}
        {!!r.englishLevel && <Text style={s.metaItem}>English: {r.englishLevel}</Text>}
        {!!r.employeeCode && <Text style={s.metaItem}>ID: {r.employeeCode}</Text>}
      </View>
      {links.length > 0 && (
        <View style={s.metaRow}>
          {links.map((l, i) => <Text key={i} style={[s.metaItem, { color: BLUE }]}>{l}</Text>)}
        </View>
      )}

      <View style={s.rule} />

      {!!r.summary && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Professional Summary</Text>
          <Text style={s.summary}>{r.summary}</Text>
        </View>
      )}

      {(r.primaryTechnology || r.secondaryTechnology || (r.skills?.length ?? 0) > 0) && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Technical Skills</Text>
          {(r.primaryTechnology || r.secondaryTechnology) && (
            <Text style={{ fontSize: 9, color: MUTED, marginBottom: 6 }}>
              {r.primaryTechnology ? `Primary: ${r.primaryTechnology}` : ''}
              {r.primaryTechnology && r.secondaryTechnology ? '    ' : ''}
              {r.secondaryTechnology ? `Secondary: ${r.secondaryTechnology}` : ''}
            </Text>
          )}
          <View style={s.chipWrap}>
            {(r.skills ?? []).map((sk, i) => <Text key={i} style={s.chip}>{sk}</Text>)}
          </View>
        </View>
      )}

      {(r.workExperience?.length ?? 0) > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Work Experience</Text>
          {r.workExperience.map((w, i) => (
            <View key={i} style={s.item} wrap={false}>
              <View style={s.itemHead}>
                <Text style={s.itemTitle}>{w.role}{w.company ? ` — ${w.company}` : ''}</Text>
                <Text style={s.itemMeta}>{fmtDate(w.startDate)} — {w.current ? 'Present' : fmtDate(w.endDate)}</Text>
              </View>
              {!!w.location && <Text style={s.itemMeta}>{w.location}</Text>}
              {!!w.description && <Text style={s.itemDesc}>{w.description}</Text>}
              {(w.responsibilities ?? []).filter(Boolean).map((b, bi) => (
                <View key={bi} style={s.bullet}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={s.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {(r.projects?.length ?? 0) > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Key Projects</Text>
          {r.projects.map((p, i) => (
            <View key={i} style={s.item} wrap={false}>
              <View style={s.itemHead}>
                <Text style={s.itemTitle}>{p.name}</Text>
                {!!p.duration && <Text style={s.itemMeta}>{p.duration}</Text>}
              </View>
              {!!p.role && <Text style={s.itemSub}>{p.role}</Text>}
              {!!p.description && <Text style={s.itemDesc}>{p.description}</Text>}
              {(p.technologies?.length ?? 0) > 0 && (
                <Text style={[s.itemMeta, { marginTop: 2 }]}>Tech: {p.technologies.join(', ')}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {(r.education?.length ?? 0) > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Education</Text>
          {r.education.map((e, i) => (
            <View key={i} style={s.item} wrap={false}>
              <View style={s.itemHead}>
                <Text style={s.itemTitle}>{e.degree}{e.field ? `, ${e.field}` : ''}</Text>
                <Text style={s.itemMeta}>{fmtDate(e.startDate)} — {fmtDate(e.endDate)}</Text>
              </View>
              {!!e.institution && <Text style={s.itemSub}>{e.institution}</Text>}
              {!!e.grade && <Text style={s.itemMeta}>{e.grade}</Text>}
            </View>
          ))}
        </View>
      )}

      {(r.certifications?.length ?? 0) > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Certifications</Text>
          {r.certifications.map((c, i) => (
            <Text key={i} style={s.itemDesc}>• {c.name}{c.issuer ? ` — ${c.issuer}` : ''}{c.date ? ` (${fmtDate(c.date)})` : ''}</Text>
          ))}
        </View>
      )}

      <Footer />
    </Page>
  );
}

export function CandidateProfileDocument({ resource }: { resource: AdminResource }) {
  return <Document title={`${resource.fullName} — Profile`} author="Step To Soft Pvt. Ltd."><CandidateProfile r={resource} /></Document>;
}

export function ClientSubmissionDocument({
  resources, clientName, message,
}: { resources: AdminResource[]; clientName?: string; message?: string }) {
  return (
    <Document title="Candidate Submission — Step To Soft" author="Step To Soft Pvt. Ltd.">
      {/* Cover + summary */}
      <Page size="A4" style={s.page}>
        <View style={s.brandRow}>
          <View>
            <Text style={s.brand}>STEP TO SOFT PVT. LTD.</Text>
            <Text style={s.brandSub}>Candidate Submission</Text>
          </View>
        </View>
        <Text style={s.coverTitle}>Candidate Submission</Text>
        {!!clientName && <Text style={s.role}>Prepared for {clientName}</Text>}
        <Text style={s.coverMsg}>
          {message || `Please find below ${resources.length} candidate profile${resources.length === 1 ? '' : 's'} shortlisted for your requirement. Detailed profiles follow this summary.`}
        </Text>
        <View style={s.rule} />
        <View style={s.section}>
          <Text style={s.sectionTitle}>Shortlist Summary</Text>
          {resources.map((r, i) => (
            <View key={i} style={s.card} wrap={false}>
              <View style={s.cardTop}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={s.itemTitle}>{r.fullName}</Text>
                  <Text style={s.itemSub}>{r.designation}</Text>
                  <View style={[s.metaRow, { marginTop: 4 }]}>
                    {r.experienceYears > 0 && <Text style={s.metaItem}><Text style={s.metaStrong}>{r.experienceYears}y</Text> exp</Text>}
                    {!!r.primaryTechnology && <Text style={s.metaItem}>{r.primaryTechnology}</Text>}
                    {!!r.location && <Text style={s.metaItem}>{r.location}</Text>}
                    <Text style={[s.metaItem, { color: availColor(r.availabilityStatus) }]}>
                      {AVAILABILITY_LABEL[r.availabilityStatus] ?? r.availabilityStatus}
                    </Text>
                  </View>
                </View>
                {typeof r.match?.score === 'number' && (
                  <Text style={s.scorePill}>{r.match.score}% match</Text>
                )}
              </View>
              {(r.skills?.length ?? 0) > 0 && (
                <View style={[s.chipWrap, { marginTop: 8 }]}>
                  {r.skills.slice(0, 12).map((sk, si) => <Text key={si} style={s.chip}>{sk}</Text>)}
                </View>
              )}
            </View>
          ))}
        </View>
        <Footer />
      </Page>

      {/* One detailed page per candidate */}
      {resources.map((r, i) => <CandidateProfile key={i} r={r} />)}
    </Document>
  );
}

/** Renders a react-pdf document element to a Blob (browser-side). */
export async function docToBlob(element: React.ReactElement): Promise<Blob> {
  return pdf(element).toBlob();
}
