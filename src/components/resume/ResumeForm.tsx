'use client';

import { useState, FormEvent } from 'react';
import type {
  AdminResume,
  ResumeExperience,
  ResumeEducation,
  ResumeCertification,
  ResumeTemplate,
} from '@/lib/adminApi';

type ProjForm = { name: string; description: string; link: string; technologies: string };
type SkillCatForm = { label: string; items: string };

type FormState = {
  fullName: string; headline: string; email: string; phone: string; location: string;
  website: string; linkedin: string; github: string; summary: string;
  skillCategories: SkillCatForm[]; languages: string; template: ResumeTemplate;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ProjForm[];
  certifications: ResumeCertification[];
};

const BLANK_EXP: ResumeExperience = { company: '', role: '', location: '', startDate: '', endDate: '', current: false, description: '' };
const BLANK_EDU: ResumeEducation = { institution: '', degree: '', field: '', startDate: '', endDate: '', grade: '' };
const BLANK_PROJ: ProjForm = { name: '', description: '', link: '', technologies: '' };
const BLANK_CERT: ResumeCertification = { name: '', issuer: '', date: '' };
const BLANK_SKILLCAT: SkillCatForm = { label: '', items: '' };

// Common category labels offered as a datalist for quick, consistent entry.
const SKILL_CATEGORY_SUGGESTIONS = [
  'Programming Languages', 'Frameworks and Libraries', 'Mobile Development',
  'Backend', 'Database', 'Tools & Platforms', 'Version Control', 'Operating Systems',
];

const TEMPLATES: { value: ResumeTemplate; label: string }[] = [
  { value: 'classic', label: 'Classic — traditional single column' },
  { value: 'modern', label: 'Modern — sidebar with accent' },
  { value: 'minimal', label: 'Minimal — clean & spacious' },
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
    template: r?.template ?? 'classic',
    experience: r?.experience?.length ? r.experience.map(e => ({ ...e })) : [{ ...BLANK_EXP }],
    education: r?.education?.length ? r.education.map(e => ({ ...e })) : [{ ...BLANK_EDU }],
    projects: r?.projects?.length
      ? r.projects.map(p => ({ name: p.name, description: p.description, link: p.link, technologies: p.technologies.join(', ') }))
      : [{ ...BLANK_PROJ }],
    certifications: r?.certifications?.length ? r.certifications.map(c => ({ ...c })) : [{ ...BLANK_CERT }],
  };
}

function formToPayload(form: FormState): Partial<AdminResume> {
  const list = (s: string) => s.split(',').map(t => t.trim()).filter(Boolean);
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
    experience: form.experience,
    education: form.education,
    projects: form.projects.map(p => ({ name: p.name, description: p.description, link: p.link, technologies: list(p.technologies) })),
    certifications: form.certifications,
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
    if (!form.fullName.trim()) {
      setError('Full name is required.');
      return;
    }
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
          <Field label="Full Name" required><input required value={form.fullName} onChange={txt('fullName')} style={input} /></Field>
          <Field label="Headline / Target Role"><input value={form.headline} onChange={txt('headline')} placeholder="e.g. Full-Stack Developer" style={input} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={txt('email')} style={input} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={txt('phone')} style={input} /></Field>
          <Field label="Location"><input value={form.location} onChange={txt('location')} placeholder="City, Country" style={input} /></Field>
          <Field label="Website / Portfolio"><input value={form.website} onChange={txt('website')} style={input} /></Field>
          <Field label="LinkedIn"><input value={form.linkedin} onChange={txt('linkedin')} style={input} /></Field>
          <Field label="GitHub"><input value={form.github} onChange={txt('github')} style={input} /></Field>
        </div>
      </Card>

      {/* Template */}
      <Card title="Template">
        <Field label="Resume template">
          <select value={form.template} onChange={txt('template')} style={input}>
            {TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
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

      {/* Languages */}
      <Card title="Languages">
        <Field label="Languages (comma-separated)"><input value={form.languages} onChange={txt('languages')} placeholder="English, Hindi, Bengali" style={input} /></Field>
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
            <div style={{ marginTop: 10 }}>
              <Field label="Description"><textarea value={e.description} onChange={ev => updateRow<ResumeExperience>('experience', i, { description: ev.target.value })} rows={3} placeholder="Key responsibilities and achievements…" style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} /></Field>
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
              <Field label="Link"><input value={p.link} onChange={ev => updateRow<ProjForm>('projects', i, { link: ev.target.value })} placeholder="https://…" style={input} /></Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Technologies (comma-separated)"><input value={p.technologies} onChange={ev => updateRow<ProjForm>('projects', i, { technologies: ev.target.value })} placeholder="React, Node.js" style={input} /></Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Description"><textarea value={p.description} onChange={ev => updateRow<ProjForm>('projects', i, { description: ev.target.value })} rows={2} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} /></Field>
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
