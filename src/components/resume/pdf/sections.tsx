import * as React from 'react';
import { View, Text, Image, StyleSheet, Link } from '@react-pdf/renderer';
import { base, color, space, type } from './theme';
import { ResumeSection, Bullet, BulletList, Chips, hasContent } from './primitives';
import type { ResumeView } from '@/lib/resumeView';
import type { CompanyBranding } from '@/lib/branding';
import type {
  ResumeExperience,
  ResumeProjectItem,
  ResumeEducation,
  ResumeCertification,
  ResumeSkillCategory,
} from '@/lib/adminApi';

/**
 * Section components shared by every premium template. Each one owns its own
 * emptiness check and returns null, so templates can compose freely without
 * guarding — no empty headings, no blank gaps.
 */

const s = StyleSheet.create({
  entry: { marginBottom: space.block + 2 },
  entryHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  entryTitle: { fontFamily: 'Helvetica-Bold', fontSize: type.body + 0.6, color: color.text },
  entrySub: { fontSize: type.small, color: color.accent, fontFamily: 'Helvetica-Bold' },
  meta: { fontSize: type.tiny, color: color.muted, textAlign: 'right' },
  metaLeft: { fontSize: type.tiny, color: color.muted },
  para: { fontSize: type.body, color: color.text, lineHeight: 1.6, marginTop: 2 },
  microLabel: {
    fontSize: type.tiny, color: color.muted, fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.4, marginTop: 4, marginBottom: 2,
  },
  skillRow: { marginBottom: 5 },
  skillLabel: { fontSize: type.small, fontFamily: 'Helvetica-Bold', color: color.primary, marginBottom: 1.5 },
  skillItems: { fontSize: type.small, color: color.text, lineHeight: 1.5 },
  link: { fontSize: type.tiny, color: color.accent, textDecoration: 'none' },
});

/** Joins non-empty parts with a separator — keeps meta lines free of stray dots. */
function join(parts: Array<string | undefined | null>, sep = ' · ') {
  return parts.map((p) => (p ?? '').trim()).filter(Boolean).join(sep);
}

function dateRange(start?: string, end?: string, current?: boolean) {
  const e = current ? 'Present' : (end ?? '').trim();
  return join([start, e], ' – ');
}

/* ── Header ───────────────────────────────────────────────────────────────── */

export function ResumeHeader({ view, compact }: { view: ResumeView; compact?: boolean }) {
  const c = view.contact;
  const contactLine = join([c.email, c.phone, c.location], '  |  ');
  const linkLine = join([c.website, c.linkedin, c.github], '  |  ');
  if (!hasContent(view.fullName, view.headline, contactLine, linkLine, view.photoUrl)) return null;

  return (
    <View style={{ marginBottom: compact ? space.block : space.section }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {view.photoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={view.photoUrl} style={{ width: 54, height: 54, borderRadius: 27, marginRight: 12 }} />
        ) : null}
        <View style={{ flex: 1 }}>
          {view.fullName ? (
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: type.name, color: color.primary, letterSpacing: 0.3 }}>
              {view.fullName}
            </Text>
          ) : null}
          {view.headline ? (
            <Text style={{ fontSize: type.role, color: color.text, marginTop: 2 }}>{view.headline}</Text>
          ) : null}
        </View>
      </View>

      {contactLine ? <Text style={[base.muted, { marginTop: 6 }]}>{contactLine}</Text> : null}
      {linkLine ? <Text style={[base.muted, { marginTop: 1 }]}>{linkLine}</Text> : null}
    </View>
  );
}

/* ── Summary ──────────────────────────────────────────────────────────────── */

export function ResumeSummary({ summary, title = 'Professional Summary' }: { summary: string; title?: string }) {
  return (
    <ResumeSection title={title} show={hasContent(summary)}>
      <Text style={base.body}>{summary}</Text>
    </ResumeSection>
  );
}

/* ── Skills ───────────────────────────────────────────────────────────────── */

export function ResumeSkillGroup({ group }: { group: ResumeSkillCategory }) {
  if (!group.items?.length) return null;
  return (
    <View style={s.skillRow} wrap={false}>
      {group.label ? <Text style={s.skillLabel}>{group.label}</Text> : null}
      <Text style={s.skillItems}>{group.items.join(', ')}</Text>
    </View>
  );
}

export function ResumeSkills({
  groups, title = 'Technical Skills',
}: { groups: ResumeSkillCategory[]; title?: string }) {
  const valid = (groups ?? []).filter((g) => g.items?.length);
  return (
    <ResumeSection title={title} show={valid.length > 0}>
      {valid.map((g, i) => <ResumeSkillGroup key={i} group={g} />)}
    </ResumeSection>
  );
}

/* ── Experience ───────────────────────────────────────────────────────────── */

function ExperienceEntry({ e }: { e: ResumeExperience }) {
  const period = dateRange(e.startDate, e.endDate, e.current);
  const rightMeta = join([period], '');
  const leftMeta = join([e.location, e.employmentType]);
  if (!hasContent(e.role, e.company, e.description, e.responsibilities, e.achievements)) return null;

  return (
    // The entry may split across pages (a long bullet list would otherwise jump
    // wholesale to the next page and strand the section heading); the header row
    // below stays together and pulls at least a couple of lines with it.
    <View style={s.entry}>
      <View style={s.entryHeadRow} wrap={false} minPresenceAhead={40}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          {e.role ? <Text style={s.entryTitle}>{e.role}</Text> : null}
          {e.company ? <Text style={s.entrySub}>{e.company}</Text> : null}
        </View>
        {rightMeta ? <Text style={s.meta}>{rightMeta}</Text> : null}
      </View>
      {leftMeta ? <Text style={s.metaLeft}>{leftMeta}</Text> : null}
      {e.description ? <Text style={s.para}>{e.description}</Text> : null}

      {e.responsibilities?.length ? (
        <>
          <Text style={s.microLabel}>KEY RESPONSIBILITIES</Text>
          <BulletList items={e.responsibilities} />
        </>
      ) : null}

      {e.achievements?.length ? (
        <>
          <Text style={s.microLabel}>ACHIEVEMENTS</Text>
          <BulletList items={e.achievements} />
        </>
      ) : null}

      {e.technologies?.length ? (
        <View style={{ marginTop: 4 }}>
          <Chips items={e.technologies} />
        </View>
      ) : null}
    </View>
  );
}

export function ResumeExperienceSection({
  items, title = 'Work Experience',
}: { items: ResumeExperience[]; title?: string }) {
  const valid = (items ?? []).filter((e) =>
    hasContent(e.role, e.company, e.description, e.responsibilities, e.achievements)
  );
  return (
    <ResumeSection title={title} show={valid.length > 0}>
      {valid.map((e, i) => <ExperienceEntry key={i} e={e} />)}
    </ResumeSection>
  );
}

/* ── Projects ─────────────────────────────────────────────────────────────── */

function ProjectEntry({ p }: { p: ResumeProjectItem }) {
  const live = (p.liveUrl || p.link || '').trim();
  const repo = (p.repoUrl || '').trim();
  if (!hasContent(p.name, p.description, p.responsibilities, p.highlights)) return null;

  return (
    <View style={s.entry}>
      <View style={s.entryHeadRow} wrap={false} minPresenceAhead={40}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          {p.name ? <Text style={s.entryTitle}>{p.name}</Text> : null}
          {p.role ? <Text style={s.entrySub}>{p.role}</Text> : null}
        </View>
        {p.duration ? <Text style={s.meta}>{p.duration}</Text> : null}
      </View>

      {live || repo ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 1 }}>
          {live ? <Link src={live} style={s.link}>{live}</Link> : null}
          {repo ? <Link src={repo} style={s.link}>{repo}</Link> : null}
        </View>
      ) : null}

      {p.description ? <Text style={s.para}>{p.description}</Text> : null}

      {p.responsibilities?.length ? (
        <>
          <Text style={s.microLabel}>RESPONSIBILITIES</Text>
          <BulletList items={p.responsibilities} />
        </>
      ) : null}

      {p.highlights?.length ? (
        <>
          <Text style={s.microLabel}>HIGHLIGHTS</Text>
          <BulletList items={p.highlights} />
        </>
      ) : null}

      {p.technologies?.length ? (
        <View style={{ marginTop: 4 }}>
          <Chips items={p.technologies} />
        </View>
      ) : null}
    </View>
  );
}

export function ResumeProjectsSection({
  items, title = 'Projects',
}: { items: ResumeProjectItem[]; title?: string }) {
  const valid = (items ?? []).filter((p) =>
    hasContent(p.name, p.description, p.responsibilities, p.highlights)
  );
  return (
    <ResumeSection title={title} show={valid.length > 0}>
      {valid.map((p, i) => <ProjectEntry key={i} p={p} />)}
    </ResumeSection>
  );
}

/* ── Education ────────────────────────────────────────────────────────────── */

export function ResumeEducationSection({
  items, title = 'Education',
}: { items: ResumeEducation[]; title?: string }) {
  const valid = (items ?? []).filter((e) => hasContent(e.degree, e.institution, e.field));
  return (
    <ResumeSection title={title} show={valid.length > 0}>
      {valid.map((e, i) => {
        const period = dateRange(e.startDate, e.endDate);
        return (
          <View key={i} style={{ marginBottom: space.block }} wrap={false}>
            <View style={s.entryHeadRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.entryTitle}>{join([e.degree, e.field], ', ')}</Text>
                {e.institution ? <Text style={s.metaLeft}>{e.institution}</Text> : null}
              </View>
              {period ? <Text style={s.meta}>{period}</Text> : null}
            </View>
            {e.grade ? <Text style={s.metaLeft}>{e.grade}</Text> : null}
          </View>
        );
      })}
    </ResumeSection>
  );
}

/* ── Certifications ───────────────────────────────────────────────────────── */

export function ResumeCertificationsSection({
  items, title = 'Certifications',
}: { items: ResumeCertification[]; title?: string }) {
  const valid = (items ?? []).filter((c) => hasContent(c.name));
  return (
    <ResumeSection title={title} show={valid.length > 0}>
      {valid.map((c, i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }} wrap={false}>
          <Text style={[base.body, { flex: 1, paddingRight: 8 }]}>{join([c.name, c.issuer], ' — ')}</Text>
          {c.date ? <Text style={s.meta}>{c.date}</Text> : null}
        </View>
      ))}
    </ResumeSection>
  );
}

/* ── Simple list sections (competencies, achievements, interests, languages) ─ */

export function ResumeBulletSection({
  items, title,
}: { items?: string[]; title: string }) {
  const list = (items ?? []).filter((i) => i && i.trim());
  return (
    <ResumeSection title={title} show={list.length > 0}>
      <BulletList items={list} />
    </ResumeSection>
  );
}

export function ResumeInlineSection({
  items, title,
}: { items?: string[]; title: string }) {
  const list = (items ?? []).filter((i) => i && i.trim());
  return (
    <ResumeSection title={title} show={list.length > 0}>
      <Text style={base.body}>{list.join(', ')}</Text>
    </ResumeSection>
  );
}

/* ── Footer (client resource profiles) ────────────────────────────────────── */

/**
 * Company logo for resource profiles. Light artwork (the common case for a logo
 * built against a dark site header) would vanish on the white page, so it is
 * placed on a dark panel unless the branding says the logo is already dark.
 */
export function ResumeLogo({
  branding, width = 92,
}: { branding: CompanyBranding; width?: number }) {
  if (!branding.logoUrl) return null;
  const img = (
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image src={branding.logoUrl} style={{ width, objectFit: 'contain' }} />
  );
  if (!branding.logoOnDark) return img;
  return (
    <View
      style={{
        backgroundColor: color.primary,
        borderRadius: 3,
        paddingVertical: 7,
        paddingHorizontal: 10,
        alignSelf: 'flex-start',
      }}
    >
      {img}
    </View>
  );
}

export function ResumeFooter({
  show, branding, left = space.page,
}: { show: boolean; branding: CompanyBranding; left?: number }) {
  if (!show) return null;
  const meta = [branding.website, branding.tagline].map((v) => (v ?? '').trim()).filter(Boolean).join('  ·  ');
  return (
    <View
      fixed
      style={{
        position: 'absolute', bottom: 18, left, right: space.page,
        borderTopWidth: 0.75, borderTopColor: color.border, paddingTop: 6,
      }}
    >
      <Text style={{ fontSize: type.tiny, color: color.primary, fontFamily: 'Helvetica-Bold', letterSpacing: 0.4 }}>
        {`Prepared by ${branding.name}`}
      </Text>
      {branding.footerNote ? (
        <Text style={{ fontSize: type.tiny, color: color.muted, marginTop: 1 }}>{branding.footerNote}</Text>
      ) : null}
      {meta ? <Text style={{ fontSize: type.tiny, color: color.muted, marginTop: 1 }}>{meta}</Text> : null}
    </View>
  );
}
