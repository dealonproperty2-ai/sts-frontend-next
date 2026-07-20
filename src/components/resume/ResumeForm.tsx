'use client';

import { useState, FormEvent } from 'react';
import TemplatePicker from './TemplatePicker';
import { DEFAULT_TEMPLATE } from './templateMeta';
import type {
  AdminResume,
  ResumeExperience,
  ResumeEducation,
  ResumeCertification,
  ResumeTemplate,
  ResumeMode,
} from '@/lib/adminApi';

type ProjForm = {
  name: string; description: string; link: string; technologies: string;
  role: string; duration: string; liveUrl: string; repoUrl: string;
  responsibilities: string; highlights: string;
};
type SkillCatForm = { label: string; items: string };

// Experience rows keep bullet lists as newline text while editing.
type ExpForm = Omit<ResumeExperience, 'technologies' | 'responsibilities' | 'achievements'> & {
  employmentType: string; technologies: string; responsibilities: string; achievements: string;
};

type FormState = {
  fullName: string; headline: string; email: string; phone: string; location: string;
  website: string; linkedin: string; github: string; summary: string;
  skillCategories: SkillCatForm[]; languages: string; template: ResumeTemplate;
  experience: ExpForm[];
  education: ResumeEducation[];
  projects: ProjForm[];
  certifications: ResumeCertification[];
  // Premium-template fields
  resumeMode: ResumeMode;
  photoUrl: string;
  yearsOfExperience: string;
  availability: string;
  englishLevel: string;
  noticePeriod: string;
  currentLocation: string;
  preferredTimeZone: string;
  primaryTechStack: string;
  coreCompetencies: string;
  achievements: string;
  interests: string;
};

const BLANK_EXP: ExpForm = {
  company: '', role: '', location: '', startDate: '', endDate: '', current: false, description: '',
  employmentType: '', technologies: '', responsibilities: '', achievements: '',
};
const BLANK_EDU: ResumeEducation = { institution: '', degree: '', field: '', startDate: '', endDate: '', grade: '' };
const BLANK_PROJ: ProjForm = {
  name: '', description: '', link: '', technologies: '',
  role: '', duration: '', liveUrl: '', repoUrl: '', responsibilities: '', highlights: '',
};
const BLANK_CERT: ResumeCertification = { name: '', issuer: '', date: '' };
const BLANK_SKILLCAT: SkillCatForm = { label: '', items: '' };

// Common category labels offered as a datalist for quick, consistent entry.
const SKILL_CATEGORY_SUGGESTIONS = [
  'Programming Languages', 'Frameworks and Libraries', 'Mobile Development',
  'Backend', 'Database', 'Tools & Platforms', 'Version Control', 'Operating Systems',
];

function resumeToForm(r?: AdminResume): FormState {
  return {
    fullName: r?.fullName ?? '',
    headline: r?.headline ?? '',
    email: r?.email ?? '',
    phone: r?.phone ?? '',
    location: r?.location ?? '',
    website: r?.website ?? '',
    linkedin: r?.linkedin ?? '',
    github: r?.github ?? '',
    summary: r?.summary ?? '',
    skillCategories: r?.skillCategories?.length
      ? r.skillCategories.map(c => ({ label: c.label, items: c.items.join(', ') }))
      : (r?.skills?.length ? [{ label: '', items: r.skills.join(', ') }] : [{ ...BLANK_SKILLCAT }]),
    languages: (r?.languages ?? []).join(', '),
    template: r?.template ?? DEFAULT_TEMPLATE,
    experience: r?.experience?.length
      ? r.experience.map(e => ({
          ...e,
          employmentType: e.employmentType ?? '',
          technologies: (e.technologies ?? []).join(', '),
          responsibilities: (e.responsibilities ?? []).join('\n'),
          achievements: (e.achievements ?? []).join('\n'),
        }))
      : [{ ...BLANK_EXP }],
    education: r?.education?.length ? r.education.map(e => ({ ...e })) : [{ ...BLANK_EDU }],
    projects: r?.projects?.length
      ? r.projects.map(p => ({
          name: p.name, description: p.description, link: p.link,
          technologies: p.technologies.join(', '),
          role: p.role ?? '', duration: p.duration ?? '',
          liveUrl: p.liveUrl ?? '', repoUrl: p.repoUrl ?? '',
          responsibilities: (p.responsibilities ?? []).join('\n'),
          highlights: (p.highlights ?? []).join('\n'),
        }))
      : [{ ...BLANK_PROJ }],
    certifications: r?.certifications?.length ? r.certifications.map(c => ({ ...c })) : [{ ...BLANK_CERT }],

    resumeMode: r?.resumeMode ?? 'employee',
    photoUrl: r?.photoUrl ?? '',
    yearsOfExperience: r?.yearsOfExperience ? String(r.yearsOfExperience) : '',
    availability: r?.availability ?? '',
    englishLevel: r?.englishLevel ?? '',
    noticePeriod: r?.noticePeriod ?? '',
    currentLocation: r?.currentLocation ?? '',
    preferredTimeZone: r?.preferredTimeZone ?? '',
    primaryTechStack: (r?.primaryTechStack ?? []).join(', '),
    coreCompetencies: (r?.coreCompetencies ?? []).join(', '),
    achievements: (r?.achievements ?? []).join('\n'),
    interests: (r?.interests ?? []).join(', '),
  };
}

function formToPayload(form: FormState): Partial<AdminResume> {
  const list = (s: string) => s.split(',').map(t => t.trim()).filter(Boolean);
  // Bullet lists are newline-separated so the text itself may contain commas.
  const lines = (s: string) =>
    s.split(/\r?\n/).map(t => t.replace(/^[\s•\-*]+/, '').trim()).filter(Boolean);
  const skillCategories = form.skillCategories
    .map(c => ({ label: c.label.trim(), items: list(c.items) }))
    .filter(c => c.items.length > 0);
  // Keep the flat skills list in sync (used for search and as a template fallback).
  const skills = skillCategories.flatMap(c => c.items);
  return {
    fullName: form.fullName.trim(),
    headline: form.headline.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    location: form.location.trim(),
    website: form.website.trim(),
    linkedin: form.linkedin.trim(),
    github: form.github.trim(),
    summary: form.summary.trim(),
    skills,
    skillCategories,
    languages: list(form.languages),
    template: form.template,
    experience: form.experience.map(e => ({
      company: e.company, role: e.role, location: e.location,
      startDate: e.startDate, endDate: e.endDate, current: e.current,
      description: e.description,
      employmentType: e.employmentType,
      technologies: list(e.technologies),
      responsibilities: lines(e.responsibilities),
      achievements: lines(e.achievements),
    })),
    education: form.education,
    projects: form.projects.map(p => ({
      name: p.name, description: p.description, link: p.link,
      technologies: list(p.technologies),
      role: p.role, duration: p.duration,
      liveUrl: p.liveUrl, repoUrl: p.repoUrl,
      responsibilities: lines(p.responsibilities),
      highlights: lines(p.highlights),
    })),
    certifications: form.certifications,

    resumeMode: form.resumeMode,
    photoUrl: form.photoUrl.trim(),
    yearsOfExperience: form.yearsOfExperience === '' ? 0 : Number(form.yearsOfExperience) || 0,
    availability: form.availability.trim(),
    englishLevel: form.englishLevel.trim(),
    noticePeriod: form.noticePeriod.trim(),
    currentLocation: form.currentLocation.trim(),
    preferredTimeZone: form.preferredTimeZone.trim(),
    primaryTechStack: list(form.primaryTechStack),
    coreCompetencies: list(form.coreCompetencies),
    achievements: lines(form.achievements),
    interests: list(form.interests),
  };
}

interface Props {
  initial?: AdminResume;
  submitLabel: string;
  onSubmit: (payload: Partial<AdminResume>) => Promise<void>;
  onCancel: () => void;
}

export default function ResumeForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() => resumeToForm(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }
  const txt = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    set(key, e.target.value as FormState[typeof key]);

  // Generic helpers for the repeatable sections
  type RowKey = 'experience' | 'education' | 'projects' | 'certifications' | 'skillCategories';
  function updateRow<T>(key: RowKey, idx: number, patch: Partial<T>) {
    setForm(prev => {
      const arr = [...(prev[key] as T[])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [key]: arr };
    });
  }
  function addRow(key: RowKey, blank: unknown) {
    setForm(prev => ({ ...prev, [key]: [...(prev[key] as unknown[]), structuredCloneSafe(blank)] }));
  }
  function removeRow(key: RowKey, idx: number) {
    setForm(prev => ({ ...prev, [key]: (prev[key] as unknown[]).filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    // No field is mandatory — empty sections simply auto-hide in the output.
    setSaving(true);
    try {
      await onSubmit(formToPayload(form));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 820, margin: '0 auto', paddingBottom: 40 }}>
      {/* Basics */}
      <Card title="Basic Information">
        <div className="rf-grid-2" style={grid2}>
          <Field label="Full Name"><input value={form.fullName} onChange={txt('fullName')} style={input} /></Field>
          <Field label="Headline / Target Role"><input value={form.headline} onChange={txt('headline')} placeholder="e.g. Full-Stack Developer" style={input} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={txt('email')} style={input} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={txt('phone')} style={input} /></Field>
          <Field label="Location"><input value={form.location} onChange={txt('location')} placeholder="City, Country" style={input} /></Field>
          <Field label="Website / Portfolio"><input value={form.website} onChange={txt('website')} style={input} /></Field>
          <Field label="LinkedIn"><input value={form.linkedin} onChange={txt('linkedin')} style={input} /></Field>
          <Field label="GitHub"><input value={form.github} onChange={txt('github')} style={input} /></Field>
        </div>
      </Card>

      {/* Template & mode */}
      <Card title="Template & Mode">
        <Field label="Resume mode">
          <select value={form.resumeMode} onChange={txt('resumeMode')} style={{ ...input, maxWidth: 420 }}>
            <option value="employee">Employee Resume — full contact details</option>
            <option value="client">Client Resource — contact details hidden</option>
          </select>
        </Field>
        <div style={{ height: 14 }} />
        <Field label="Resume template">
          <TemplatePicker
            value={form.template}
            mode={form.resumeMode}
            onChange={(id) => set('template', id)}
          />
        </Field>
        <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 8, lineHeight: 1.5 }}>
          Client Resource mode removes email, phone, address, links, photo, interests and
          references from the generated PDF entirely — they are never written to the file.
          Applies to the two premium templates.
        </div>
      </Card>

      {/* Resource profile */}
      <Card title="Resource Profile">
        <div className="rf-grid-2" style={grid2}>
          <Field label="Years of experience">
            <input type="number" min="0" max="60" step="0.5" value={form.yearsOfExperience} onChange={txt('yearsOfExperience')} placeholder="5" style={input} />
          </Field>
          <Field label="English level">
            <input value={form.englishLevel} onChange={txt('englishLevel')} placeholder="Professional / Fluent / B2" style={input} />
          </Field>
          <Field label="Availability">
            <input value={form.availability} onChange={txt('availability')} placeholder="Immediate / 2 weeks" style={input} />
          </Field>
          <Field label="Profile photo URL (employee mode only)">
            <input value={form.photoUrl} onChange={txt('photoUrl')} placeholder="https://…" style={input} />
          </Field>
        </div>
        <div className="rf-grid-2" style={{ ...grid2, marginTop: 12 }}>
          <Field label="Notice period">
            <input value={form.noticePeriod} onChange={txt('noticePeriod')} placeholder="30 days" style={input} />
          </Field>
          <Field label="Current location">
            <input value={form.currentLocation} onChange={txt('currentLocation')} placeholder="Asansol, India" style={input} />
          </Field>
          <Field label="Preferred time zone">
            <input value={form.preferredTimeZone} onChange={txt('preferredTimeZone')} placeholder="IST / UTC+5:30 · overlaps EST" style={input} />
          </Field>
          <Field label="Primary tech stack (comma-separated)">
            <input value={form.primaryTechStack} onChange={txt('primaryTechStack')} placeholder="React, Node.js, AWS" style={input} />
          </Field>
        </div>
        <div style={{ height: 12 }} />
        <Field label="Core competencies (comma-separated)">
          <input value={form.coreCompetencies} onChange={txt('coreCompetencies')} placeholder="System Design, Code Review, Mentoring" style={input} />
        </Field>
        <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 8, lineHeight: 1.5 }}>
          These appear on Client Resource profiles. Employee resumes ignore any left blank.
        </div>
      </Card>

      {/* Summary */}
      <Card title="Professional Summary">
        <textarea value={form.summary} onChange={txt('summary')} rows={4} placeholder="2–4 sentences highlighting strengths and goals." style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} />
      </Card>

      {/* Skills (categorized) */}
      <Card title="Technical Skills" onAdd={() => addRow('skillCategories', BLANK_SKILLCAT)} addLabel="+ Add category">
        <datalist id="skill-category-suggestions">
          {SKILL_CATEGORY_SUGGESTIONS.map(s => <option key={s} value={s} />)}
        </datalist>
        <div style={{ fontSize: 12, color: 'var(--fg-4)', marginBottom: 12 }}>
          Group skills under a heading (e.g. “Programming Languages”). Each renders as one bullet on the resume.
        </div>
        {form.skillCategories.map((c, i) => (
          <Row key={i} onRemove={form.skillCategories.length > 1 ? () => removeRow('skillCategories', i) : undefined}>
            <div className="rf-grid-label" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
              <Field label="Category"><input list="skill-category-suggestions" value={c.label} onChange={ev => updateRow<SkillCatForm>('skillCategories', i, { label: ev.target.value })} placeholder="Programming Languages" style={input} /></Field>
              <Field label="Skills (comma-separated)"><input value={c.items} onChange={ev => updateRow<SkillCatForm>('skillCategories', i, { items: ev.target.value })} placeholder="HTML5, CSS3, JavaScript" style={input} /></Field>
            </div>
          </Row>
        ))}
      </Card>

      {/* Languages, achievements & interests */}
      <Card title="Languages, Achievements & Interests">
        <Field label="Languages (comma-separated)"><input value={form.languages} onChange={txt('languages')} placeholder="English, Hindi, Bengali" style={input} /></Field>
        <div style={{ height: 12 }} />
        <Field label="Key achievements (one per line)">
          <textarea value={form.achievements} onChange={txt('achievements')} rows={3} placeholder={'Led migration of 12 services…\nSpeaker at…'} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} />
        </Field>
        <div style={{ height: 12 }} />
        <Field label="Interests (comma-separated — employee mode only)">
          <input value={form.interests} onChange={txt('interests')} placeholder="Open source, Chess" style={input} />
        </Field>
      </Card>

      {/* Experience */}
      <Card title="Experience" onAdd={() => addRow('experience', BLANK_EXP)} addLabel="+ Add experience">
        {form.experience.map((e, i) => (
          <Row key={i} onRemove={form.experience.length > 1 ? () => removeRow('experience', i) : undefined}>
            <div className="rf-grid-2" style={grid2}>
              <Field label="Role"><input value={e.role} onChange={ev => updateRow<ResumeExperience>('experience', i, { role: ev.target.value })} style={input} /></Field>
              <Field label="Company"><input value={e.company} onChange={ev => updateRow<ResumeExperience>('experience', i, { company: ev.target.value })} style={input} /></Field>
              <Field label="Location"><input value={e.location} onChange={ev => updateRow<ResumeExperience>('experience', i, { location: ev.target.value })} style={input} /></Field>
              <Field label="Start"><input value={e.startDate} onChange={ev => updateRow<ResumeExperience>('experience', i, { startDate: ev.target.value })} placeholder="Jan 2023" style={input} /></Field>
              <Field label="End"><input value={e.endDate} disabled={e.current} onChange={ev => updateRow<ResumeExperience>('experience', i, { endDate: ev.target.value })} placeholder="Dec 2024" style={{ ...input, opacity: e.current ? 0.5 : 1 }} /></Field>
              <label style={checkRow}><input type="checkbox" checked={e.current} onChange={ev => updateRow<ResumeExperience>('experience', i, { current: ev.target.checked })} /> Currently working here</label>
            </div>
            <div className="rf-grid-2" style={{ ...grid2, marginTop: 10 }}>
              <Field label="Employment type"><input value={e.employmentType} onChange={ev => updateRow<ExpForm>('experience', i, { employmentType: ev.target.value })} placeholder="Full-time / Contract" style={input} /></Field>
              <Field label="Technology stack (comma-separated)"><input value={e.technologies} onChange={ev => updateRow<ExpForm>('experience', i, { technologies: ev.target.value })} placeholder="React, Node.js, AWS" style={input} /></Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Description"><textarea value={e.description} onChange={ev => updateRow<ExpForm>('experience', i, { description: ev.target.value })} rows={2} placeholder="Short context about the role…" style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} /></Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Responsibilities (one per line)"><textarea value={e.responsibilities} onChange={ev => updateRow<ExpForm>('experience', i, { responsibilities: ev.target.value })} rows={3} placeholder={'Built and maintained…\nCollaborated with…'} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} /></Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Achievements (one per line)"><textarea value={e.achievements} onChange={ev => updateRow<ExpForm>('experience', i, { achievements: ev.target.value })} rows={2} placeholder={'Cut API latency by 40%…'} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} /></Field>
            </div>
          </Row>
        ))}
      </Card>

      {/* Education */}
      <Card title="Education" onAdd={() => addRow('education', BLANK_EDU)} addLabel="+ Add education">
        {form.education.map((e, i) => (
          <Row key={i} onRemove={form.education.length > 1 ? () => removeRow('education', i) : undefined}>
            <div className="rf-grid-2" style={grid2}>
              <Field label="Degree"><input value={e.degree} onChange={ev => updateRow<ResumeEducation>('education', i, { degree: ev.target.value })} placeholder="B.Tech" style={input} /></Field>
              <Field label="Field of study"><input value={e.field} onChange={ev => updateRow<ResumeEducation>('education', i, { field: ev.target.value })} placeholder="Computer Science" style={input} /></Field>
              <Field label="Institution"><input value={e.institution} onChange={ev => updateRow<ResumeEducation>('education', i, { institution: ev.target.value })} style={input} /></Field>
              <Field label="Grade / GPA"><input value={e.grade} onChange={ev => updateRow<ResumeEducation>('education', i, { grade: ev.target.value })} placeholder="8.5 CGPA" style={input} /></Field>
              <Field label="Start"><input value={e.startDate} onChange={ev => updateRow<ResumeEducation>('education', i, { startDate: ev.target.value })} placeholder="2019" style={input} /></Field>
              <Field label="End"><input value={e.endDate} onChange={ev => updateRow<ResumeEducation>('education', i, { endDate: ev.target.value })} placeholder="2023" style={input} /></Field>
            </div>
          </Row>
        ))}
      </Card>

      {/* Projects */}
      <Card title="Projects" onAdd={() => addRow('projects', BLANK_PROJ)} addLabel="+ Add project">
        {form.projects.map((p, i) => (
          <Row key={i} onRemove={form.projects.length > 1 ? () => removeRow('projects', i) : undefined}>
            <div className="rf-grid-2" style={grid2}>
              <Field label="Project name"><input value={p.name} onChange={ev => updateRow<ProjForm>('projects', i, { name: ev.target.value })} style={input} /></Field>
              <Field label="Your role"><input value={p.role} onChange={ev => updateRow<ProjForm>('projects', i, { role: ev.target.value })} placeholder="Lead Developer" style={input} /></Field>
              <Field label="Duration"><input value={p.duration} onChange={ev => updateRow<ProjForm>('projects', i, { duration: ev.target.value })} placeholder="Jan 2024 – Jun 2024" style={input} /></Field>
              <Field label="Technologies (comma-separated)"><input value={p.technologies} onChange={ev => updateRow<ProjForm>('projects', i, { technologies: ev.target.value })} placeholder="React, Node.js" style={input} /></Field>
              <Field label="Live URL"><input value={p.liveUrl} onChange={ev => updateRow<ProjForm>('projects', i, { liveUrl: ev.target.value })} placeholder="https://…" style={input} /></Field>
              <Field label="Repository URL"><input value={p.repoUrl} onChange={ev => updateRow<ProjForm>('projects', i, { repoUrl: ev.target.value })} placeholder="https://github.com/…" style={input} /></Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Description"><textarea value={p.description} onChange={ev => updateRow<ProjForm>('projects', i, { description: ev.target.value })} rows={2} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} /></Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Responsibilities (one per line)"><textarea value={p.responsibilities} onChange={ev => updateRow<ProjForm>('projects', i, { responsibilities: ev.target.value })} rows={2} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} /></Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Highlights (one per line)"><textarea value={p.highlights} onChange={ev => updateRow<ProjForm>('projects', i, { highlights: ev.target.value })} rows={2} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} /></Field>
            </div>
          </Row>
        ))}
      </Card>

      {/* Certifications */}
      <Card title="Certifications" onAdd={() => addRow('certifications', BLANK_CERT)} addLabel="+ Add certification">
        {form.certifications.map((c, i) => (
          <Row key={i} onRemove={form.certifications.length > 1 ? () => removeRow('certifications', i) : undefined}>
            <div className="rf-grid-3" style={grid3}>
              <Field label="Name"><input value={c.name} onChange={ev => updateRow<ResumeCertification>('certifications', i, { name: ev.target.value })} style={input} /></Field>
              <Field label="Issuer"><input value={c.issuer} onChange={ev => updateRow<ResumeCertification>('certifications', i, { issuer: ev.target.value })} style={input} /></Field>
              <Field label="Date"><input value={c.date} onChange={ev => updateRow<ResumeCertification>('certifications', i, { date: ev.target.value })} placeholder="2024" style={input} /></Field>
            </div>
          </Row>
        ))}
      </Card>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#f87171' }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'var(--bg)', padding: '12px 0', borderTop: '1px solid var(--line)' }}>
        <button type="button" onClick={onCancel} style={btnSecondary}>Cancel</button>
        <button type="submit" disabled={saving} style={btnPrimary}>{saving ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}

// structuredClone may be unavailable in older runtimes; fall back to JSON clone.
function structuredCloneSafe<T>(v: T): T {
  try { return structuredClone(v); } catch { return JSON.parse(JSON.stringify(v)); }
}

function Card({ title, children, onAdd, addLabel }: { title: string; children: React.ReactNode; onAdd?: () => void; addLabel?: string }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{title}</div>
        {onAdd && <button type="button" onClick={onAdd} style={btnAdd}>{addLabel}</button>}
      </div>
      {children}
    </div>
  );
}

function Row({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <div style={{ position: 'relative', padding: '14px', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', marginBottom: 12, background: 'var(--bg-2)' }}>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove" style={{ position: 'absolute', top: 8, right: 8, padding: '3px 9px', fontSize: 11, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>Remove</button>
      )}
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>{label}{required && <span style={{ color: '#f87171' }}> *</span>}</label>
      {children}
    </div>
  );
}

const input: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, color: 'var(--fg)', width: '100%',
  background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none',
  fontFamily: 'inherit',
};
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 };
const checkRow: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--fg-2)', cursor: 'pointer', alignSelf: 'end', paddingBottom: 8 };
const btnPrimary: React.CSSProperties = { padding: '9px 20px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { padding: '9px 20px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnAdd: React.CSSProperties = { padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent-edge)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
