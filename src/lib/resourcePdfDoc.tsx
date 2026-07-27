/**
 * Premium enterprise candidate-submission PDFs for the Active Resource module.
 *
 * These documents are sent DIRECTLY TO CLIENTS by an outsourcing company, so
 * they are built around two hard rules:
 *   1. Confidentiality — the client must NEVER see a candidate's direct contact
 *      details (phone, personal email, LinkedIn, GitHub, portfolio, address).
 *      Only professional, evaluation-relevant information is rendered.
 *   2. Premium presentation — branded header/footer on every page, categorised
 *      skills, timeline-style experience cards, project cards, and a binding
 *      confidentiality notice, modelled on TCS / Infosys / Accenture bench docs.
 *
 * This module imports the heavy `@react-pdf/renderer` at the top level and is
 * therefore ONLY loaded through a dynamic import() from resourcePdf.ts. Output
 * is fully text-based (built-in Helvetica) — print-sharp and ATS-parseable.
 */
import {
  Document, Page, Text, View, StyleSheet, pdf,
} from '@react-pdf/renderer';
import type { AdminResource } from '@/lib/adminApi';

/* ── Brand + company ─────────────────────────────────────────────────────── */
const BLUE = '#2D36D9';
const BLUE_DARK = '#1B2185';
const ORANGE = '#F58220';
const INK = '#171A29';
const BODY = '#343A4D';
const MUTED = '#6C7280';
const LINE = '#E4E7F2';
const SOFT = '#EEF0FE';
const CARD = '#F7F8FC';

const COMPANY = {
  name: 'STEP TO SOFT PVT. LTD.',
  tagline: 'Professional IT Development & Resource Outsourcing Company',
  website: 'https://steptosoft.com',
  email: 'hr@steptosoft.com',
  phone: '+91 3413556956',
  address: 'Module 21, Asansol Webel IT Park',
};

const AVAILABILITY_LABEL: Record<string, string> = {
  available: 'Available', on_project: 'On Project', reserved: 'Reserved',
  interview_scheduled: 'Interview Scheduled', joining_soon: 'Joining Soon',
  on_leave: 'On Leave', inactive: 'Inactive',
};
function availColor(status: string) {
  switch (status) {
    case 'available': return '#15924B';
    case 'on_project': return '#C42B2B';
    case 'reserved': return BLUE;
    case 'interview_scheduled': return ORANGE;
    case 'joining_soon': return '#6D28D9';
    default: return MUTED;
  }
}

/* ── Skill categorisation ────────────────────────────────────────────────── */
// Group a flat skill list into the client-facing categories. First match wins,
// in category order; anything unmatched falls into "Other".
const CATEGORY_MAP: { name: string; match: string[] }[] = [
  { name: 'Frontend', match: ['html', 'css', 'javascript', 'typescript', 'react', 'next.js', 'nextjs', 'angular', 'vue', 'vue.js', 'redux', 'tailwind', 'sass', 'scss', 'bootstrap', 'jquery', 'svelte', 'material ui', 'chakra'] },
  { name: 'Backend', match: ['node.js', 'nodejs', 'node', 'express', 'nestjs', 'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'spring boot', 'c#', '.net', '.net core', 'php', 'laravel', 'ruby', 'ruby on rails', 'go', 'golang', 'rust', 'graphql', 'rest api', 'rest', 'microservices'] },
  { name: 'Database', match: ['mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'sqlite', 'oracle', 'sql server', 'mssql', 'dynamodb', 'cassandra', 'elasticsearch', 'firebase', 'firestore', 'sql'] },
  { name: 'Cloud & DevOps', match: ['aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'jenkins', 'github actions', 'serverless', 'lambda', 'ec2', 's3', 'nginx', 'ansible'] },
  { name: 'Frameworks', match: ['react native', 'flutter', 'swift', 'kotlin', 'ionic', 'xamarin', 'electron', 'spring boot', 'symfony', 'codeigniter'] },
  { name: 'Tools', match: ['git', 'github', 'gitlab', 'bitbucket', 'jira', 'figma', 'postman', 'webpack', 'vite', 'npm', 'yarn', 'vs code', 'linux', 'confluence', 'slack'] },
];

function categorizeSkills(resource: AdminResource): { name: string; skills: string[] }[] {
  const all = new Set<string>();
  for (const s of resource.skills ?? []) if (s?.trim()) all.add(s.trim());
  if (resource.primaryTechnology?.trim()) all.add(resource.primaryTechnology.trim());
  if (resource.secondaryTechnology?.trim()) all.add(resource.secondaryTechnology.trim());

  const buckets: Record<string, string[]> = {};
  const order = [...CATEGORY_MAP.map(c => c.name), 'Other'];
  const other: string[] = [];

  for (const skill of all) {
    const lc = skill.toLowerCase();
    const cat = CATEGORY_MAP.find(c => c.match.includes(lc));
    if (cat) (buckets[cat.name] ??= []).push(skill);
    else other.push(skill);
  }
  if (other.length) buckets['Other'] = other;
  return order.filter(n => buckets[n]?.length).map(n => ({ name: n, skills: buckets[n] }));
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: { paddingTop: 96, paddingBottom: 58, paddingHorizontal: 42, fontFamily: 'Helvetica', fontSize: 9.5, color: BODY, lineHeight: 1.5, backgroundColor: '#FFFFFF' },

  // Header (fixed on every page)
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 26, paddingHorizontal: 42 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  // Wordmark: the company name IS the brand mark here, so it carries the extra
  // weight and tracking a logo would otherwise have provided.
  hName: { fontSize: 14.5, fontFamily: 'Helvetica-Bold', color: INK, letterSpacing: 1.5, lineHeight: 1.25 },
  hTag: { fontSize: 7, color: MUTED, marginTop: 2.5, letterSpacing: 0.45 },
  headerRight: { alignItems: 'flex-end' },
  hContact: { fontSize: 7.5, color: MUTED, marginBottom: 1 },
  rule: { flexDirection: 'row', marginTop: 12, height: 2.6, borderRadius: 2 },
  ruleOrange: { width: 64, backgroundColor: ORANGE, borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
  ruleBlue: { flex: 1, backgroundColor: BLUE, borderTopRightRadius: 2, borderBottomRightRadius: 2 },

  // Footer (fixed on every page)
  footer: { position: 'absolute', bottom: 22, left: 42, right: 42 },
  footerRule: { height: 0.75, backgroundColor: LINE, marginBottom: 6 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fText: { fontSize: 6.8, color: MUTED },
  fStrong: { fontSize: 6.8, color: BLUE, fontFamily: 'Helvetica-Bold', letterSpacing: 0.6 },

  // Candidate header
  // The 21pt name needs an explicit line height: inheriting the page's 1.5 left
  // the descenders of the name sitting on top of the designation beneath it.
  candName: { fontSize: 21, fontFamily: 'Helvetica-Bold', color: INK, lineHeight: 1.25 },
  candRole: { fontSize: 11.5, color: BLUE, fontFamily: 'Helvetica-Bold', marginTop: 5, lineHeight: 1.35 },
  badge: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff', paddingVertical: 3.5, paddingHorizontal: 9, borderRadius: 3 },
  factStrip: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, backgroundColor: CARD, borderWidth: 0.75, borderColor: LINE, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 4 },
  fact: { paddingVertical: 5, paddingHorizontal: 10, minWidth: '20%' },
  factLabel: { fontSize: 6.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: 'Helvetica-Bold' },
  factValue: { fontSize: 9.5, color: INK, marginTop: 2 },

  // Sections
  section: { marginTop: 17 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  sectionMark: { width: 4, height: 13, backgroundColor: BLUE, borderRadius: 2, marginRight: 7 },
  sectionTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: INK, letterSpacing: 0.8, textTransform: 'uppercase' },

  // Summary card
  summaryCard: { backgroundColor: SOFT, borderLeftWidth: 3, borderLeftColor: BLUE, borderRadius: 5, padding: 12 },
  summaryText: { fontSize: 9.5, color: '#2B3145', lineHeight: 1.65 },

  // Skills
  skillRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' },
  skillCat: { width: 88, fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, paddingTop: 3 },
  skillWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  chip: { fontSize: 8.5, color: BLUE_DARK, backgroundColor: SOFT, borderWidth: 0.5, borderColor: '#D5D9F7', borderRadius: 3, paddingVertical: 2.5, paddingHorizontal: 8, marginRight: 5, marginBottom: 5 },
  techChip: { fontSize: 8, color: MUTED, backgroundColor: '#F1F2F7', borderRadius: 3, paddingVertical: 2, paddingHorizontal: 7, marginRight: 5, marginBottom: 4 },

  // Experience / project cards
  card: { borderWidth: 0.75, borderColor: LINE, borderRadius: 6, padding: 12, marginBottom: 9, backgroundColor: '#FFFFFF' },
  expCard: { borderWidth: 0.75, borderColor: LINE, borderLeftWidth: 3, borderLeftColor: ORANGE, borderRadius: 6, padding: 12, marginBottom: 9, backgroundColor: '#FFFFFF' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: INK },
  cardSub: { fontSize: 9, color: BLUE, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  cardMeta: { fontSize: 8, color: MUTED, textAlign: 'right' },
  cardDesc: { fontSize: 9.5, color: BODY, marginTop: 5, lineHeight: 1.55 },
  subLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 7, marginBottom: 3 },
  bullet: { flexDirection: 'row', marginTop: 1.5 },
  bulletDot: { width: 9, fontSize: 9, color: BLUE, fontFamily: 'Helvetica-Bold' },
  bulletText: { flex: 1, fontSize: 9.5, color: BODY, lineHeight: 1.5 },

  // Two-column optional sections
  twoCol: { flexDirection: 'row', justifyContent: 'space-between' },
  colHalf: { width: '48%' },
  miniItem: { marginBottom: 6 },
  miniTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: INK },
  miniSub: { fontSize: 8.5, color: MUTED },

  // Confidentiality
  confidBox: { marginTop: 20, borderWidth: 0.75, borderColor: '#F1C7A6', backgroundColor: '#FFF8F2', borderRadius: 6, padding: 14 },
  confidTag: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: ORANGE, letterSpacing: 1.5, marginBottom: 6 },
  confidText: { fontSize: 8, color: '#5C4A38', lineHeight: 1.6, marginBottom: 5 },

  // Multi-candidate summary page
  coverKicker: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 1.5, marginBottom: 4 },
  // Same reason as candName: without an explicit line height this 25pt title
  // gets a box sized from the inherited 9.5pt and overruns whatever follows.
  coverTitle: { fontSize: 25, fontFamily: 'Helvetica-Bold', color: INK, lineHeight: 1.25 },
  coverMsg: { fontSize: 10, color: BODY, marginTop: 10, lineHeight: 1.65 },
  sumRow: { flexDirection: 'row', borderWidth: 0.75, borderColor: LINE, borderRadius: 6, padding: 11, marginBottom: 8, alignItems: 'flex-start' },
  sumIndex: { width: 22, height: 22, borderRadius: 11, backgroundColor: BLUE, color: '#fff', fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingTop: 5, marginRight: 10 },
  scorePill: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: BLUE, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 8 },
});

function fmtDate(v?: string) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/* ── Shared chrome ───────────────────────────────────────────────────────── */
function Header() {
  return (
    <View style={s.header} fixed>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          {/* Typographic wordmark only — deliberately no logo/image. */}
          <View>
            <Text style={s.hName}>{COMPANY.name}</Text>
            <Text style={s.hTag}>{COMPANY.tagline}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Text style={s.hContact}>{COMPANY.website}</Text>
          <Text style={s.hContact}>{COMPANY.email}</Text>
          <Text style={s.hContact}>{COMPANY.phone}</Text>
        </View>
      </View>
      <View style={s.rule}>
        <View style={s.ruleOrange} />
        <View style={s.ruleBlue} />
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <View style={s.footerRule} />
      <View style={s.footerRow}>
        <Text style={s.fStrong}>CONFIDENTIAL</Text>
        <Text style={s.fText}>© {COMPANY.name}  ·  {COMPANY.website}  ·  {COMPANY.email}  ·  {COMPANY.phone}</Text>
        <Text style={s.fText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
      </View>
    </View>
  );
}

/**
 * `minPresenceAhead` reserves space for the start of the section's content. If
 * that much room isn't left on the page the heading moves to the next page WITH
 * its content, instead of stranding at the bottom above a page-sized gap — which
 * is what produced the empty half-page under "WORK EXPERIENCE".
 */
function SectionTitle({ title }: { title: string }) {
  return (
    <View style={s.sectionHead} minPresenceAhead={68}>
      <View style={s.sectionMark} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function Fact({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={s.fact}>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={s.factValue}>{String(value)}</Text>
    </View>
  );
}

/* ── Candidate profile (client-safe: NO direct contact details) ──────────── */
function CandidateProfile({ r }: { r: AdminResource }) {
  const skillGroups = categorizeSkills(r);
  return (
    <>
      {/* Candidate header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={s.candName}>{r.fullName}</Text>
          {!!r.designation && <Text style={s.candRole}>{r.designation}</Text>}
        </View>
        <Text style={[s.badge, { backgroundColor: availColor(r.availabilityStatus) }]}>
          {AVAILABILITY_LABEL[r.availabilityStatus] ?? r.availabilityStatus}
        </Text>
      </View>

      <View style={s.factStrip}>
        <Fact label="Experience" value={r.experienceYears ? `${r.experienceYears} Years` : ''} />
        <Fact label="Location" value={r.location} />
        <Fact label="English" value={r.englishLevel} />
        <Fact label="Resource ID" value={r.employeeCode} />
        <Fact label="Notice Period" value={r.noticePeriod} />
        <Fact label="Time Zone" value={r.timeZone} />
      </View>

      {/* Professional summary */}
      {!!r.summary && (
        <View style={s.section}>
          <SectionTitle title="Professional Summary" />
          <View style={s.summaryCard}><Text style={s.summaryText}>{r.summary}</Text></View>
        </View>
      )}

      {/* Technical skills — grouped */}
      {skillGroups.length > 0 && (
        <View style={s.section}>
          <SectionTitle title="Technical Skills" />
          {skillGroups.map((g, i) => (
            <View key={i} style={s.skillRow}>
              <Text style={s.skillCat}>{g.name}</Text>
              <View style={s.skillWrap}>
                {g.skills.map((sk, j) => <Text key={j} style={s.chip}>{sk}</Text>)}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Work experience */}
      {(r.workExperience?.length ?? 0) > 0 && (
        <View style={s.section}>
          <SectionTitle title="Work Experience" />
          {r.workExperience.map((w, i) => {
            const resp = (w.responsibilities ?? []).filter(Boolean);
            return (
              // No `wrap={false}` here: a role with many responsibilities can be
              // taller than the printable area, and forcing it onto one page
              // either overflowed or pushed a near-empty page. It now flows
              // across pages; the pieces that must not split say so themselves.
              <View key={i} style={s.expCard}>
                <View style={s.cardTopRow} wrap={false} minPresenceAhead={40}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={s.cardTitle}>{w.role || 'Role'}</Text>
                    {!!w.company && <Text style={s.cardSub}>{w.company}</Text>}
                  </View>
                  <View>
                    <Text style={s.cardMeta}>{fmtDate(w.startDate)} — {w.current ? 'Present' : fmtDate(w.endDate)}</Text>
                    {!!w.location && <Text style={s.cardMeta}>{w.location}</Text>}
                  </View>
                </View>
                {!!w.description && <Text style={s.cardDesc}>{w.description}</Text>}
                {resp.length > 0 && (
                  <>
                    <Text style={s.subLabel} minPresenceAhead={26}>Key Responsibilities</Text>
                    {resp.map((b, bi) => (
                      <View key={bi} style={s.bullet} wrap={false}>
                        <Text style={s.bulletDot}>•</Text>
                        <Text style={s.bulletText}>{b}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Projects */}
      {(r.projects?.length ?? 0) > 0 && (
        <View style={s.section}>
          <SectionTitle title="Projects" />
          {r.projects.map((p, i) => (
            <View key={i} style={s.card} wrap={false}>
              <View style={s.cardTopRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={s.cardTitle}>{p.name}</Text>
                  {!!p.role && <Text style={s.cardSub}>{p.role}</Text>}
                </View>
                {!!p.duration && <Text style={s.cardMeta}>{p.duration}</Text>}
              </View>
              {!!p.description && <Text style={s.cardDesc}>{p.description}</Text>}
              {(p.technologies?.length ?? 0) > 0 && (
                <>
                  <Text style={s.subLabel}>Technologies</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {p.technologies.map((t, ti) => <Text key={ti} style={s.techChip}>{t}</Text>)}
                  </View>
                </>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Optional: Education + Certifications side by side when both short */}
      {(r.education?.length ?? 0) > 0 && (
        <View style={s.section}>
          <SectionTitle title="Education" />
          {r.education.map((e, i) => (
            <View key={i} style={[s.cardTopRow, { marginBottom: 6 }]} wrap={false}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={s.miniTitle}>{e.degree}{e.field ? `, ${e.field}` : ''}</Text>
                {!!e.institution && <Text style={s.miniSub}>{e.institution}{e.grade ? `  ·  ${e.grade}` : ''}</Text>}
              </View>
              <Text style={s.cardMeta}>{fmtDate(e.startDate)} — {fmtDate(e.endDate)}</Text>
            </View>
          ))}
        </View>
      )}

      {(r.certifications?.length ?? 0) > 0 && (
        <View style={s.section}>
          <SectionTitle title="Certifications" />
          {r.certifications.map((c, i) => (
            <View key={i} style={s.bullet}>
              <Text style={s.bulletDot}>•</Text>
              <Text style={s.bulletText}>{c.name}{c.issuer ? ` — ${c.issuer}` : ''}{c.date ? ` (${fmtDate(c.date)})` : ''}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Languages — English proficiency only (no personal data) */}
      {!!r.englishLevel && (
        <View style={s.section}>
          <SectionTitle title="Languages" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Text style={s.chip}>English — {r.englishLevel}</Text>
          </View>
        </View>
      )}
    </>
  );
}

/* ── Confidentiality notice ──────────────────────────────────────────────── */
function ConfidentialityNotice() {
  return (
    <View style={s.confidBox} wrap={false}>
      <Text style={s.confidTag}>CONFIDENTIAL</Text>
      <Text style={s.confidText}>
        This candidate profile has been shared exclusively by {COMPANY.name} for evaluation purposes only.
      </Text>
      <Text style={s.confidText}>
        The candidate remains an employee / resource of {COMPANY.name}, and all communication, interview
        scheduling, commercial discussions, and hiring processes must be conducted only through {COMPANY.name}.
      </Text>
      <Text style={[s.confidText, { marginBottom: 0 }]}>
        Direct communication, solicitation, recruitment, or engagement of the candidate without the written
        consent of {COMPANY.name} is strictly prohibited.
      </Text>
    </View>
  );
}

/* ── Multi-candidate summary page ────────────────────────────────────────── */
function SummaryPage({ resources, clientName, message }: {
  resources: AdminResource[]; clientName?: string; message?: string;
}) {
  return (
    <Page size="A4" style={s.page}>
      <Header />
      <Text style={s.coverKicker}>CANDIDATE SUBMISSION</Text>
      <Text style={s.coverTitle}>Shortlisted Candidates</Text>
      {!!clientName && <Text style={s.candRole}>Prepared exclusively for {clientName}</Text>}
      <Text style={s.coverMsg}>
        {message || `${COMPANY.name} is pleased to submit ${resources.length} pre-screened candidate${resources.length === 1 ? '' : 's'} matched to your requirement. A detailed, confidential profile for each candidate follows this summary.`}
      </Text>

      <View style={[s.section, { marginTop: 16 }]}>
        <SectionTitle title="Shortlist Overview" />
        {resources.map((r, i) => (
          <View key={i} style={s.sumRow} wrap={false}>
            <Text style={s.sumIndex}>{i + 1}</Text>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={s.cardTitle}>{r.fullName}</Text>
              <Text style={s.cardSub}>{r.designation}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 }}>
                {r.experienceYears > 0 && <Text style={[s.miniSub, { marginRight: 12 }]}>{r.experienceYears} yrs experience</Text>}
                {!!r.primaryTechnology && <Text style={[s.miniSub, { marginRight: 12 }]}>{r.primaryTechnology}</Text>}
                {!!r.location && <Text style={[s.miniSub, { marginRight: 12 }]}>{r.location}</Text>}
                <Text style={[s.miniSub, { color: availColor(r.availabilityStatus), fontFamily: 'Helvetica-Bold' }]}>
                  {AVAILABILITY_LABEL[r.availabilityStatus] ?? r.availabilityStatus}
                </Text>
              </View>
              {(r.skills?.length ?? 0) > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                  {r.skills.slice(0, 10).map((sk, si) => <Text key={si} style={s.techChip}>{sk}</Text>)}
                </View>
              )}
            </View>
            {typeof r.match?.score === 'number' && (
              <Text style={s.scorePill}>{r.match.score}% fit</Text>
            )}
          </View>
        ))}
      </View>
      <Footer />
    </Page>
  );
}

/* ── Document assembly ───────────────────────────────────────────────────── */
function buildDocument(resources: AdminResource[], opts: { clientName?: string; message?: string }) {
  const { clientName, message } = opts;
  const multi = resources.length > 1;
  const title = multi ? 'Candidate Submission — Step To Soft' : `${resources[0]?.fullName ?? 'Candidate'} — Profile`;
  return (
    <Document title={title} author={COMPANY.name} subject="Confidential Candidate Submission" creator={COMPANY.name}>
      {multi && <SummaryPage resources={resources} clientName={clientName} message={message} />}
      {resources.map((r, i) => (
        <Page key={i} size="A4" style={s.page}>
          <Header />
          <CandidateProfile r={r} />
          {/* Confidentiality notice closes the document after the final candidate. */}
          {i === resources.length - 1 && <ConfidentialityNotice />}
          <Footer />
        </Page>
      ))}
    </Document>
  );
}

export function CandidateProfileDocument({ resource }: { resource: AdminResource }) {
  return buildDocument([resource], {});
}

export function ClientSubmissionDocument({ resources, clientName, message }: {
  resources: AdminResource[]; clientName?: string; message?: string;
}) {
  return buildDocument(resources, { clientName, message });
}

/** Renders a react-pdf document element to a Blob (browser-side). */
export async function docToBlob(element: React.ReactElement): Promise<Blob> {
  return pdf(element).toBlob();
}
