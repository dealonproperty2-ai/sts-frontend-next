import * as React from 'react';
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { base, color, space, type } from '../theme';
import { ResumeSection, MetaRow, hasContent, Chips } from '../primitives';
import {
  ResumeSummary,
  ResumeSkillGroup,
  ResumeExperienceSection,
  ResumeProjectsSection,
  ResumeEducationSection,
  ResumeCertificationsSection,
  ResumeBulletSection,
  ResumeInlineSection,
  ResumeLogo,
  ResumeFooter,
} from '../sections';
import type { TemplateProps } from '../registry';

/**
 * Template 1 — Corporate Sidebar.
 * Left rail carries identity + scannable facts (skills, competencies, education);
 * the right column carries the narrative (summary, experience, projects).
 * Mirrors the structure used in enterprise resource profiles.
 */

const RAIL = 176;

const s = StyleSheet.create({
  page: { ...base.page, flexDirection: 'row', paddingTop: 0, paddingBottom: 46 },
  railBand: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: RAIL,
    backgroundColor: color.surface, borderRightWidth: 0.75, borderRightColor: color.border,
  },
  rail: { width: RAIL, paddingHorizontal: 16, paddingTop: 26 },
  main: { flex: 1, paddingHorizontal: 22, paddingTop: 26 },
  railTitle: {
    fontFamily: 'Helvetica-Bold', fontSize: type.section - 0.5, color: color.primary,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  railRule: { borderBottomWidth: 0.75, borderBottomColor: color.border, marginBottom: 6 },
  name: { fontFamily: 'Helvetica-Bold', fontSize: type.name, color: color.primary, lineHeight: 1.15 },
  role: { fontSize: type.role, color: color.text, marginTop: 3 },
  headerRule: { borderBottomWidth: 1.5, borderBottomColor: color.primary, width: 54, marginTop: 8, marginBottom: 10 },
  contactLine: { fontSize: type.small, color: color.text, marginBottom: 2.5, lineHeight: 1.45 },
  logo: { width: 96, marginBottom: 10 },
  resourceTag: {
    fontSize: type.tiny, color: color.accent, fontFamily: 'Helvetica-Bold',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
});

export default function CorporateSidebar({ view, branding }: TemplateProps) {
  const isClient = view.mode === 'client';
  const hasProfileFacts = hasContent(
    view.yearsOfExperience, view.englishLevel, view.availability,
    view.noticePeriod, view.currentLocation, view.preferredTimeZone
  );
  const c = view.contact;
  const contacts = [c.email, c.phone, c.location, c.website, c.linkedin, c.github]
    .map((v) => (v ?? '').trim())
    .filter(Boolean);

  return (
    <Page size="A4" style={s.page}>
      {/* Rail band repeats on every page so multi-page exports stay consistent. */}
      <View fixed style={s.railBand} />

      {/* ── Left rail ─────────────────────────────────────────────── */}
      <View style={s.rail}>
        {isClient ? (
          <View style={{ marginBottom: 12 }}>
            <ResumeLogo branding={branding} width={86} />
          </View>
        ) : null}

        {!isClient && view.photoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={view.photoUrl} style={{ width: 74, height: 74, borderRadius: 37, marginBottom: 10 }} />
        ) : null}

        <ResumeSection wrap={false} title="Profile" show={hasProfileFacts} rule titleStyle={s.railTitle}>
          <MetaRow label="Experience" value={view.yearsOfExperience ? `${view.yearsOfExperience}+ Years` : ''} />
          <MetaRow label="English" value={view.englishLevel} />
          <MetaRow label="Availability" value={view.availability} />
          <MetaRow label="Notice Period" value={view.noticePeriod} />
          <MetaRow label="Location" value={view.currentLocation} />
          <MetaRow label="Time Zone" value={view.preferredTimeZone} />
        </ResumeSection>

        <ResumeSection wrap={false} title="Primary Stack" show={view.primaryTechStack.length > 0} rule titleStyle={s.railTitle}>
          <Chips items={view.primaryTechStack} />
        </ResumeSection>

        {/* Contact is structurally absent in client mode. */}
        <ResumeSection wrap={false} title="Contact" show={contacts.length > 0} rule titleStyle={s.railTitle}>
          {contacts.map((v, i) => <Text key={i} style={s.contactLine}>{v}</Text>)}
        </ResumeSection>

        <ResumeSection title="Skills" show={view.skillGroups.length > 0} rule titleStyle={s.railTitle}>
          {view.skillGroups.map((g, i) => <ResumeSkillGroup key={i} group={g} />)}
        </ResumeSection>

        <ResumeSection wrap={false} title="Core Competencies" show={view.coreCompetencies.length > 0} rule titleStyle={s.railTitle}>
          <Chips items={view.coreCompetencies} />
        </ResumeSection>

        <ResumeSection wrap={false} title="Languages" show={view.languages.length > 0} rule titleStyle={s.railTitle}>
          <Text style={{ fontSize: type.small, color: color.text, lineHeight: 1.5 }}>
            {view.languages.join(', ')}
          </Text>
        </ResumeSection>

        <ResumeSection title="Education" show={view.education.length > 0} rule titleStyle={s.railTitle}>
          {view.education.map((e, i) => {
            const line = [e.degree, e.field].filter(Boolean).join(', ');
            const period = [e.startDate, e.endDate].filter(Boolean).join(' – ');
            if (!line && !e.institution) return null;
            return (
              <View key={i} style={{ marginBottom: 6 }} wrap={false}>
                {line ? <Text style={{ fontSize: type.small, fontFamily: 'Helvetica-Bold', color: color.text }}>{line}</Text> : null}
                {e.institution ? <Text style={{ fontSize: type.tiny, color: color.muted }}>{e.institution}</Text> : null}
                {period || e.grade ? (
                  <Text style={{ fontSize: type.tiny, color: color.muted }}>
                    {[period, e.grade].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ResumeSection>

        {!isClient ? <ResumeInlineSection title="Interests" items={view.interests} /> : null}
      </View>

      {/* ── Main column ───────────────────────────────────────────── */}
      <View style={s.main}>
        <View>
          {isClient ? <Text style={s.resourceTag}>Technical Resource Profile</Text> : null}
          {view.fullName ? <Text style={s.name}>{view.fullName}</Text> : null}
          {view.headline ? <Text style={s.role}>{view.headline}</Text> : null}
          {hasContent(view.fullName, view.headline) ? <View style={s.headerRule} /> : null}
        </View>

        <ResumeSummary summary={view.summary} />
        <ResumeExperienceSection items={view.experience} />
        <ResumeProjectsSection items={view.projects} />
        <ResumeCertificationsSection items={view.certifications} />
        <ResumeBulletSection title="Key Achievements" items={view.achievements} />
      </View>

      {/* Footer starts after the rail so it never sits on the tinted band. */}
      <ResumeFooter show={isClient} branding={branding} left={RAIL + 22} />
    </Page>
  );
}
