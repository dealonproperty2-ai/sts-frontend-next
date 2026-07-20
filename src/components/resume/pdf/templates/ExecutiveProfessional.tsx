import * as React from 'react';
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { base, color, space, type } from '../theme';
import { ResumeSection, hasContent, Chips } from '../primitives';
import {
  ResumeSummary,
  ResumeSkills,
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
 * Template 2 — Executive Professional.
 * Single-column, full-width sections. The most ATS-friendly arrangement: strict
 * top-to-bottom reading order, no columns for a parser to mis-thread.
 */

const s = StyleSheet.create({
  page: {
    ...base.page,
    paddingTop: 30,
    paddingBottom: 48,
    paddingHorizontal: space.page,
  },
  header: { marginBottom: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  // Explicit line heights: inheriting the 1.6 body leading mis-measures the
  // large display sizes and lets the role collide with the name.
  name: { fontFamily: 'Helvetica-Bold', fontSize: type.name, color: color.primary, letterSpacing: 0.3, lineHeight: 1.2 },
  role: { fontSize: type.role, color: color.text, marginTop: 3, lineHeight: 1.3 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: color.primary, marginTop: 10, marginBottom: 12 },
  contact: { fontSize: type.small, color: color.muted, marginTop: 6, lineHeight: 1.5 },
  logo: { width: 104 },
  resourceTag: {
    fontSize: type.tiny, color: color.accent, fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3,
  },
  factRow: {
    flexDirection: 'row', gap: 22, marginTop: 8,
    borderTopWidth: 0.75, borderTopColor: color.border, paddingTop: 7,
  },
  factLabel: { fontSize: type.tiny, color: color.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  factValue: { fontSize: type.small, color: color.text, fontFamily: 'Helvetica-Bold', marginTop: 1 },
});

function Fact({ label, value }: { label: string; value?: string }) {
  const v = (value ?? '').trim();
  if (!v) return null;
  return (
    <View>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={s.factValue}>{v}</Text>
    </View>
  );
}

export default function ExecutiveProfessional({ view, branding }: TemplateProps) {
  const isClient = view.mode === 'client';
  const c = view.contact;
  const contactLine = [c.email, c.phone, c.location].map((v) => (v ?? '').trim()).filter(Boolean).join('   |   ');
  const linkLine = [c.website, c.linkedin, c.github].map((v) => (v ?? '').trim()).filter(Boolean).join('   |   ');

  const facts = [
    view.yearsOfExperience ? `${view.yearsOfExperience}+ Years` : '',
    view.englishLevel, view.availability,
    view.noticePeriod, view.currentLocation, view.preferredTimeZone,
  ].some(Boolean);

  return (
    <Page size="A4" style={s.page}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headRow}>
          {!isClient && view.photoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={view.photoUrl} style={{ width: 58, height: 58, borderRadius: 29, marginRight: 14 }} />
          ) : null}

          <View style={{ flex: 1 }}>
            {isClient ? <Text style={s.resourceTag}>Technical Resource Profile</Text> : null}
            {view.fullName ? <Text style={s.name}>{view.fullName}</Text> : null}
            {view.headline ? <Text style={s.role}>{view.headline}</Text> : null}
          </View>

          {isClient ? <ResumeLogo branding={branding} width={96} /> : null}
        </View>

        {contactLine ? <Text style={s.contact}>{contactLine}</Text> : null}
        {linkLine ? <Text style={[s.contact, { marginTop: 1 }]}>{linkLine}</Text> : null}

        {facts ? (
          <View style={s.factRow}>
            <Fact label="Experience" value={view.yearsOfExperience ? `${view.yearsOfExperience}+ Years` : ''} />
            <Fact label="English" value={view.englishLevel} />
            <Fact label="Availability" value={view.availability} />
            <Fact label="Notice" value={view.noticePeriod} />
            <Fact label="Location" value={view.currentLocation} />
            <Fact label="Time Zone" value={view.preferredTimeZone} />
          </View>
        ) : null}

        {hasContent(view.fullName, view.headline, contactLine, linkLine) ? <View style={s.rule} /> : null}
      </View>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <ResumeSummary summary={view.summary} />

      <ResumeSection title="Primary Tech Stack" show={view.primaryTechStack.length > 0}>
        <Chips items={view.primaryTechStack} />
      </ResumeSection>

      <ResumeSkills groups={view.skillGroups} />

      <ResumeSection title="Core Competencies" show={view.coreCompetencies.length > 0}>
        <Chips items={view.coreCompetencies} />
      </ResumeSection>

      <ResumeExperienceSection items={view.experience} />
      <ResumeProjectsSection items={view.projects} />
      <ResumeEducationSection items={view.education} />
      <ResumeCertificationsSection items={view.certifications} />
      <ResumeBulletSection title="Key Achievements" items={view.achievements} />
      <ResumeInlineSection title="Languages" items={view.languages} />
      {!isClient ? <ResumeInlineSection title="Interests" items={view.interests} /> : null}

      <ResumeSection title="References" show={view.references.length > 0}>
        {view.references.map((r, i) => (
          <Text key={i} style={[base.body, { marginBottom: 2 }]}>
            {[r.name, r.designation, r.company, r.contact].filter(Boolean).join(' · ')}
          </Text>
        ))}
      </ResumeSection>

      <ResumeFooter show={isClient} branding={branding} />
    </Page>
  );
}
