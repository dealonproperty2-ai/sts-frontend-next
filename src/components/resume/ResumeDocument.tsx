'use client';

import * as React from 'react';
import type {
  AdminResume,
  ResumeExperience,
  ResumeEducation,
  ResumeProjectItem,
  ResumeCertification,
  ResumeTemplate,
} from '@/lib/adminApi';

// A4 at ~96dpi. The same fixed pixel size is used on screen and captured by
// html2canvas for the PDF, so the download matches the preview exactly.
export const A4_WIDTH = 794;
export const A4_MIN_HEIGHT = 1123;

const ACCENT = '#2d36d9';

function dateRange(start: string, end: string, current?: boolean) {
  const e = current ? 'Present' : end;
  if (start && e) return `${start} — ${e}`;
  return start || e || '';
}

function hasContact(r: AdminResume) {
  return [r.email, r.phone, r.location, r.website, r.linkedin, r.github].some(Boolean);
}

function skillCats(r: AdminResume) {
  return (r.skillCategories ?? []).filter((c) => c.items.length > 0);
}

// Categorized skills rendered as a bulleted list with a bold category label,
// e.g. "• Programming Languages: HTML5, CSS3, JavaScript".
function CategorizedSkills({
  categories, labelColor, textColor, bullets = true, fontSize = 12.5,
}: {
  categories: { label: string; items: string[] }[];
  labelColor: string;
  textColor: string;
  bullets?: boolean;
  fontSize?: number;
}) {
  return (
    <ul style={{ margin: 0, paddingLeft: bullets ? 20 : 0, listStyleType: bullets ? 'disc' : 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {categories.map((c, i) => (
        <li key={i} style={{ fontSize, lineHeight: 1.5, color: textColor }}>
          {c.label && <strong style={{ color: labelColor, fontWeight: 700 }}>{c.label}: </strong>}
          {c.items.join(', ')}
        </li>
      ))}
    </ul>
  );
}

/* ════════════════════════ CLASSIC ════════════════════════ */
function Classic({ r }: { r: AdminResume }) {
  const heading: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
    color: '#111', borderBottom: '2px solid #111', paddingBottom: 4, marginBottom: 10,
  };
  return (
    <div style={{ padding: '48px 56px', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1a1a' }}>
      <div style={{ textAlign: 'center', borderBottom: '3px double #111', paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '0.04em' }}>{r.fullName || 'Your Name'}</div>
        {r.headline && <div style={{ fontSize: 14, color: '#444', marginTop: 4, fontStyle: 'italic' }}>{r.headline}</div>}
        {hasContact(r) && (
          <div style={{ fontSize: 11.5, color: '#333', marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            {r.email && <span>{r.email}</span>}
            {r.phone && <span>{r.phone}</span>}
            {r.location && <span>{r.location}</span>}
            {r.website && <span>{r.website}</span>}
            {r.linkedin && <span>{r.linkedin}</span>}
            {r.github && <span>{r.github}</span>}
          </div>
        )}
      </div>

      {r.summary && (
        <Section heading={heading} title="Professional Summary">
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: '#333', whiteSpace: 'pre-wrap' }}>{r.summary}</p>
        </Section>
      )}

      {(skillCats(r).length > 0 || r.skills.length > 0) && (
        <Section heading={heading} title="Technical Skills">
          {skillCats(r).length > 0
            ? <CategorizedSkills categories={skillCats(r)} labelColor="#111" textColor="#333" />
            : <div style={{ fontSize: 12.5, color: '#333', lineHeight: 1.7 }}>{r.skills.join('  ·  ')}</div>}
        </Section>
      )}

      {r.experience.length > 0 && (
        <Section heading={heading} title="Experience">
          {r.experience.map((e, i) => <ExperienceBlock key={i} e={e} />)}
        </Section>
      )}

      {r.projects.length > 0 && (
        <Section heading={heading} title="Project Experience">
          {r.projects.map((p, i) => <ProjectBlock key={i} p={p} />)}
        </Section>
      )}

      {r.education.length > 0 && (
        <Section heading={heading} title="Education">
          {r.education.map((e, i) => <EducationBlock key={i} e={e} />)}
        </Section>
      )}

      {r.certifications.length > 0 && (
        <Section heading={heading} title="Certifications">
          {r.certifications.map((c, i) => <CertBlock key={i} c={c} />)}
        </Section>
      )}

      {r.languages.length > 0 && (
        <Section heading={heading} title="Languages">
          <div style={{ fontSize: 12.5, color: '#333' }}>{r.languages.join(', ')}</div>
        </Section>
      )}
    </div>
  );
}

/* ════════════════════════ MODERN ════════════════════════ */
function Modern({ r }: { r: AdminResume }) {
  const sideHeading: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
    color: '#fff', marginBottom: 8, opacity: 0.95,
  };
  const mainHeading: React.CSSProperties = {
    fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: 4, marginBottom: 12,
  };
  return (
    <div style={{ display: 'flex', minHeight: A4_MIN_HEIGHT, fontFamily: 'Arial, Helvetica, sans-serif', color: '#1f2937' }}>
      {/* Sidebar */}
      <div style={{ width: 250, flexShrink: 0, background: '#1a1f3c', color: '#fff', padding: '40px 26px' }}>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.15 }}>{r.fullName || 'Your Name'}</div>
        {r.headline && <div style={{ fontSize: 12.5, color: '#aab2d5', marginTop: 6 }}>{r.headline}</div>}

        {hasContact(r) && (
          <div style={{ marginTop: 24 }}>
            <div style={sideHeading}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, color: '#dfe3f3', wordBreak: 'break-word' }}>
              {r.email && <span>{r.email}</span>}
              {r.phone && <span>{r.phone}</span>}
              {r.location && <span>{r.location}</span>}
              {r.website && <span>{r.website}</span>}
              {r.linkedin && <span>{r.linkedin}</span>}
              {r.github && <span>{r.github}</span>}
            </div>
          </div>
        )}

        {(skillCats(r).length > 0 || r.skills.length > 0) && (
          <div style={{ marginTop: 24 }}>
            <div style={sideHeading}>Skills</div>
            {skillCats(r).length > 0 ? (
              <CategorizedSkills categories={skillCats(r)} labelColor="#fff" textColor="#dfe3f3" bullets={false} fontSize={11.5} />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {r.skills.map((s, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 4, background: 'rgba(255,255,255,0.12)', color: '#eef0fb' }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {r.education.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={sideHeading}>Education</div>
            {r.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 12, fontSize: 11.5, color: '#dfe3f3' }}>
                <div style={{ fontWeight: 700, color: '#fff' }}>{e.degree}{e.field ? `, ${e.field}` : ''}</div>
                <div>{e.institution}</div>
                <div style={{ color: '#aab2d5' }}>{dateRange(e.startDate, e.endDate)}{e.grade ? ` · ${e.grade}` : ''}</div>
              </div>
            ))}
          </div>
        )}

        {r.languages.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={sideHeading}>Languages</div>
            <div style={{ fontSize: 11.5, color: '#dfe3f3' }}>{r.languages.join(', ')}</div>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '40px 32px' }}>
        {r.summary && (
          <Section heading={mainHeading} title="Profile">
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-wrap' }}>{r.summary}</p>
          </Section>
        )}
        {r.experience.length > 0 && (
          <Section heading={mainHeading} title="Experience">
            {r.experience.map((e, i) => <ExperienceBlock key={i} e={e} accent />)}
          </Section>
        )}
        {r.projects.length > 0 && (
          <Section heading={mainHeading} title="Projects">
            {r.projects.map((p, i) => <ProjectBlock key={i} p={p} accent />)}
          </Section>
        )}
        {r.certifications.length > 0 && (
          <Section heading={mainHeading} title="Certifications">
            {r.certifications.map((c, i) => <CertBlock key={i} c={c} />)}
          </Section>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════ MINIMAL ════════════════════════ */
function Minimal({ r }: { r: AdminResume }) {
  const heading: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em',
    color: '#9ca3af', marginBottom: 12,
  };
  return (
    <div style={{ padding: '56px 64px', fontFamily: '"Helvetica Neue", Arial, sans-serif', color: '#222' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 32, fontWeight: 300, letterSpacing: '0.01em' }}>{r.fullName || 'Your Name'}</div>
        {r.headline && <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{r.headline}</div>}
        {hasContact(r) && (
          <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {r.email && <span>{r.email}</span>}
            {r.phone && <span>{r.phone}</span>}
            {r.location && <span>{r.location}</span>}
            {r.website && <span>{r.website}</span>}
            {r.linkedin && <span>{r.linkedin}</span>}
            {r.github && <span>{r.github}</span>}
          </div>
        )}
      </div>

      {r.summary && (
        <Section heading={heading} title="About" gap={28}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap' }}>{r.summary}</p>
        </Section>
      )}
      {r.experience.length > 0 && (
        <Section heading={heading} title="Experience" gap={28}>
          {r.experience.map((e, i) => <ExperienceBlock key={i} e={e} />)}
        </Section>
      )}
      {r.education.length > 0 && (
        <Section heading={heading} title="Education" gap={28}>
          {r.education.map((e, i) => <EducationBlock key={i} e={e} />)}
        </Section>
      )}
      {r.projects.length > 0 && (
        <Section heading={heading} title="Projects" gap={28}>
          {r.projects.map((p, i) => <ProjectBlock key={i} p={p} />)}
        </Section>
      )}
      {(skillCats(r).length > 0 || r.skills.length > 0) && (
        <Section heading={heading} title="Skills" gap={28}>
          {skillCats(r).length > 0
            ? <CategorizedSkills categories={skillCats(r)} labelColor="#222" textColor="#374151" bullets={false} fontSize={13} />
            : <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>{r.skills.join(',  ')}</div>}
        </Section>
      )}
      {r.certifications.length > 0 && (
        <Section heading={heading} title="Certifications" gap={28}>
          {r.certifications.map((c, i) => <CertBlock key={i} c={c} />)}
        </Section>
      )}
      {r.languages.length > 0 && (
        <Section heading={heading} title="Languages" gap={28}>
          <div style={{ fontSize: 13, color: '#374151' }}>{r.languages.join(', ')}</div>
        </Section>
      )}
    </div>
  );
}

/* ════════════════════ shared blocks ════════════════════ */
function Section({ heading, title, children, gap = 20 }: { heading: React.CSSProperties; title: string; children: React.ReactNode; gap?: number }) {
  return (
    <div style={{ marginBottom: gap }}>
      <div style={heading}>{title}</div>
      {children}
    </div>
  );
}

function ExperienceBlock({ e, accent }: { e: ResumeExperience; accent?: boolean }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: accent ? '#111827' : '#1a1a1a' }}>
          {e.role || 'Role'}{e.company ? <span style={{ fontWeight: 400, color: accent ? ACCENT : '#444' }}>{` · ${e.company}`}</span> : null}
        </span>
        <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{dateRange(e.startDate, e.endDate, e.current)}</span>
      </div>
      {e.location && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{e.location}</div>}
      {e.description && <p style={{ margin: '5px 0 0', fontSize: 12, lineHeight: 1.55, color: '#374151', whiteSpace: 'pre-wrap' }}>{e.description}</p>}
    </div>
  );
}

function EducationBlock({ e }: { e: ResumeEducation }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{e.degree || 'Degree'}{e.field ? `, ${e.field}` : ''}</span>
        <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{dateRange(e.startDate, e.endDate)}</span>
      </div>
      <div style={{ fontSize: 12, color: '#444' }}>{e.institution}{e.grade ? ` · ${e.grade}` : ''}</div>
    </div>
  );
}

function ProjectBlock({ p, accent }: { p: ResumeProjectItem; accent?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
        {p.name || 'Project'}
        {p.link && <span style={{ fontWeight: 400, fontSize: 11, color: accent ? ACCENT : '#2563eb', marginLeft: 8 }}>{p.link}</span>}
      </div>
      {p.description && <p style={{ margin: '3px 0 0', fontSize: 12, lineHeight: 1.55, color: '#374151', whiteSpace: 'pre-wrap' }}>{p.description}</p>}
      {p.technologies.length > 0 && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{p.technologies.join(' · ')}</div>}
    </div>
  );
}

function CertBlock({ c }: { c: ResumeCertification }) {
  return (
    <div style={{ marginBottom: 8, fontSize: 12.5, color: '#374151', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span><strong style={{ color: '#1a1a1a' }}>{c.name}</strong>{c.issuer ? ` — ${c.issuer}` : ''}</span>
      {c.date && <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{c.date}</span>}
    </div>
  );
}

/* ════════════════════════ wrapper ════════════════════════ */
interface ResumeDocumentProps {
  resume: AdminResume;
  template?: ResumeTemplate;
  /** When true, render at fixed A4 width (for capture/print). Defaults to true. */
  id?: string;
}

export default function ResumeDocument({ resume, template, id }: ResumeDocumentProps) {
  const t = template ?? resume.template ?? 'classic';
  return (
    <div
      id={id}
      style={{
        width: A4_WIDTH,
        minHeight: A4_MIN_HEIGHT,
        background: '#fff',
        color: '#111',
        margin: '0 auto',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}
    >
      {t === 'modern' ? <Modern r={resume} /> : t === 'minimal' ? <Minimal r={resume} /> : <Classic r={resume} />}
    </div>
  );
}
