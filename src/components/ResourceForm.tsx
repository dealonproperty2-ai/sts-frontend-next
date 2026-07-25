'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import {
  adminApi, AdminResource, ResourceType, AvailabilityStatus, Employee,
  ResourceCertification, ResourceExperienceItem, ResourceProjectEntry, ResourceEducationItem,
} from '@/lib/adminApi';

export const AVAILABILITY_OPTIONS: { value: AvailabilityStatus; label: string; color: string }[] = [
  { value: 'available', label: 'Available', color: '#16A34A' },
  { value: 'on_project', label: 'On Project', color: '#DC2626' },
  { value: 'reserved', label: 'Reserved', color: '#2D36D9' },
  { value: 'interview_scheduled', label: 'Interview Scheduled', color: '#F58220' },
  { value: 'joining_soon', label: 'Joining Soon', color: '#7C3AED' },
  { value: 'on_leave', label: 'On Leave', color: '#64748B' },
  { value: 'inactive', label: 'Inactive', color: '#94A3B8' },
];

const ENGLISH_LEVELS = ['Basic', 'Conversational', 'Professional', 'Fluent', 'Native'];

// Suggested technologies — free text is still allowed; these just speed entry.
export const SKILL_SUGGESTIONS = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Angular', 'Vue.js',
  'Node.js', 'Express', 'NestJS', 'Python', 'Django', 'Flask', 'FastAPI', 'Java',
  'Spring Boot', 'C#', '.NET', 'PHP', 'Laravel', 'Ruby on Rails', 'Go', 'Rust',
  'React Native', 'Flutter', 'Swift', 'Kotlin', 'MongoDB', 'PostgreSQL', 'MySQL',
  'Redis', 'GraphQL', 'REST API', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'CI/CD', 'Terraform', 'Git', 'Figma', 'UI/UX', 'Data Science', 'Machine Learning', 'AI/ML',
];

type FormState = {
  resourceType: ResourceType;
  employee: string;
  fullName: string;
  employeeCode: string;
  profilePhotoUrl: string;
  designation: string;
  experienceYears: string;
  skills: string;
  primaryTechnology: string;
  secondaryTechnology: string;
  currentCompany: string;
  location: string;
  timeZone: string;
  availabilityStatus: AvailabilityStatus;
  resumeUrl: string;
  resumeName: string;
  resumeType: string;
  resumeSize: number;
  portfolioUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  englishLevel: string;
  noticePeriod: string;
  expectedJoiningDate: string;
  summary: string;
  certifications: ResourceCertification[];
  workExperience: ResourceExperienceItem[];
  projects: ResourceProjectEntry[];
  education: ResourceEducationItem[];
};

const BLANK: FormState = {
  resourceType: 'internal', employee: '', fullName: '', employeeCode: '', profilePhotoUrl: '',
  designation: '', experienceYears: '', skills: '', primaryTechnology: '', secondaryTechnology: '',
  currentCompany: '', location: '', timeZone: '', availabilityStatus: 'available',
  resumeUrl: '', resumeName: '', resumeType: '', resumeSize: 0,
  portfolioUrl: '', linkedinUrl: '', githubUrl: '', englishLevel: '', noticePeriod: '',
  expectedJoiningDate: '', summary: '', certifications: [], workExperience: [], projects: [], education: [],
};

function toForm(r: AdminResource): FormState {
  const empId = typeof r.employee === 'object' && r.employee ? r.employee._id : (r.employee ?? '') || '';
  return {
    resourceType: r.resourceType,
    employee: empId,
    fullName: r.fullName ?? '',
    employeeCode: r.employeeCode ?? '',
    profilePhotoUrl: r.profilePhotoUrl ?? '',
    designation: r.designation ?? '',
    experienceYears: r.experienceYears != null ? String(r.experienceYears) : '',
    skills: (r.skills ?? []).join(', '),
    primaryTechnology: r.primaryTechnology ?? '',
    secondaryTechnology: r.secondaryTechnology ?? '',
    currentCompany: r.currentCompany ?? '',
    location: r.location ?? '',
    timeZone: r.timeZone ?? '',
    availabilityStatus: r.availabilityStatus,
    resumeUrl: r.resumeUrl ?? '', resumeName: r.resumeName ?? '', resumeType: r.resumeType ?? '', resumeSize: r.resumeSize ?? 0,
    portfolioUrl: r.portfolioUrl ?? '', linkedinUrl: r.linkedinUrl ?? '', githubUrl: r.githubUrl ?? '',
    englishLevel: r.englishLevel ?? '', noticePeriod: r.noticePeriod ?? '',
    expectedJoiningDate: r.expectedJoiningDate ? r.expectedJoiningDate.slice(0, 10) : '',
    summary: r.summary ?? '',
    certifications: r.certifications ?? [],
    workExperience: r.workExperience ?? [],
    projects: r.projects ?? [],
    education: r.education ?? [],
  };
}

export default function ResourceForm({
  target, onClose, onSaved,
}: { target: AdminResource | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(target ? toForm(target) : BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empQuery, setEmpQuery] = useState('');

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }));
  const input = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(k, e.target.value as FormState[typeof k]);

  // Load employees for the internal-link picker (only for internal resources).
  const loadEmployees = useCallback(async (q: string) => {
    try {
      const params: Record<string, string> = { limit: '20' };
      if (q) params.search = q;
      const res = await adminApi.employees(params);
      setEmployees(res.data);
    } catch { /* non-blocking */ }
  }, []);

  useEffect(() => {
    if (form.resourceType === 'internal') loadEmployees(empQuery);
  }, [form.resourceType, empQuery, loadEmployees]);

  function linkEmployee(emp: Employee) {
    setForm(p => ({
      ...p,
      employee: emp._id,
      fullName: p.fullName || emp.name,
      employeeCode: emp.employeeId || p.employeeCode,
      designation: p.designation || emp.designation,
      location: p.location || emp.workLocation,
      currentCompany: p.currentCompany || 'Step To Soft Pvt. Ltd.',
    }));
  }

  async function uploadResume(file: File) {
    setUploadingResume(true); setError('');
    try {
      const res = await adminApi.uploadResourceFile(file, 'resume');
      setForm(p => ({ ...p, resumeUrl: res.fileUrl, resumeName: res.fileName, resumeType: res.fileType, resumeSize: res.fileSize }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Resume upload failed'); }
    finally { setUploadingResume(false); }
  }
  async function uploadPhoto(file: File) {
    setUploadingPhoto(true); setError('');
    try {
      const res = await adminApi.uploadResourceFile(file, 'image');
      setForm(p => ({ ...p, profilePhotoUrl: res.fileUrl }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Photo upload failed'); }
    finally { setUploadingPhoto(false); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim()) { setError('Full name is required.'); return; }
    const years = form.experienceYears === '' ? 0 : Number(form.experienceYears);
    if (!Number.isFinite(years) || years < 0 || years > 60) { setError('Experience must be between 0 and 60 years.'); return; }

    setSaving(true);
    try {
      const payload: Partial<AdminResource> = {
        resourceType: form.resourceType,
        employee: form.resourceType === 'internal' && form.employee ? form.employee : null,
        fullName: form.fullName.trim(),
        employeeCode: form.employeeCode.trim(),
        profilePhotoUrl: form.profilePhotoUrl,
        designation: form.designation.trim(),
        experienceYears: years,
        skills: form.skills.split(',').map(x => x.trim()).filter(Boolean),
        primaryTechnology: form.primaryTechnology.trim(),
        secondaryTechnology: form.secondaryTechnology.trim(),
        currentCompany: form.currentCompany.trim(),
        location: form.location.trim(),
        timeZone: form.timeZone.trim(),
        availabilityStatus: form.availabilityStatus,
        resumeUrl: form.resumeUrl, resumeName: form.resumeName, resumeType: form.resumeType, resumeSize: form.resumeSize,
        portfolioUrl: form.portfolioUrl.trim(), linkedinUrl: form.linkedinUrl.trim(), githubUrl: form.githubUrl.trim(),
        englishLevel: form.englishLevel, noticePeriod: form.noticePeriod.trim(),
        expectedJoiningDate: form.expectedJoiningDate,
        summary: form.summary.trim(),
        certifications: form.certifications.filter(c => c.name?.trim()),
        workExperience: form.workExperience.filter(w => w.role?.trim() || w.company?.trim()),
        projects: form.projects.filter(p => p.name?.trim()),
        education: form.education.filter(ed => ed.degree?.trim() || ed.institution?.trim()),
      };
      if (target) await adminApi.updateResource(target._id, payload);
      else await adminApi.createResource(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={panelHead}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>
            {target ? 'Edit Resource' : 'Add Resource'}
          </div>
          <button onClick={onClose} style={xBtn} aria-label="Close">✕</button>
        </div>

        <form onSubmit={submit} style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Resource type toggle */}
          <div style={{ display: 'flex', gap: 10 }}>
            {(['internal', 'external'] as ResourceType[]).map(t => (
              <button key={t} type="button" onClick={() => set('resourceType', t)}
                style={{
                  flex: 1, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  borderRadius: 'var(--r-sm)', textTransform: 'capitalize',
                  border: `1px solid ${form.resourceType === t ? 'var(--accent)' : 'var(--line-strong)'}`,
                  background: form.resourceType === t ? 'var(--accent-soft)' : 'var(--bg-2)',
                  color: form.resourceType === t ? 'var(--accent)' : 'var(--fg-3)',
                }}>
                {t === 'internal' ? '🏢 Internal (Employee)' : '🌐 External (Freelance)'}
              </button>
            ))}
          </div>

          {/* Employee link (internal only) */}
          {form.resourceType === 'internal' && (
            <Section title="Link to Employee">
              <div style={{ fontSize: 12, color: 'var(--fg-4)', marginBottom: 8 }}>
                Optionally link this resource to an existing employee record to prefill their details.
              </div>
              <input placeholder="Search employees by name / ID…" value={empQuery} onChange={e => setEmpQuery(e.target.value)} style={inp} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, maxHeight: 120, overflowY: 'auto' }}>
                {employees.map(emp => (
                  <button key={emp._id} type="button" onClick={() => linkEmployee(emp)}
                    style={{
                      padding: '6px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 'var(--r-sm)',
                      border: `1px solid ${form.employee === emp._id ? 'var(--accent)' : 'var(--line)'}`,
                      background: form.employee === emp._id ? 'var(--accent-soft)' : 'var(--bg-2)',
                      color: form.employee === emp._id ? 'var(--accent)' : 'var(--fg-2)',
                    }}>
                    {emp.name} <span style={{ color: 'var(--fg-4)' }}>· {emp.employeeId}</span>
                  </button>
                ))}
                {employees.length === 0 && <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>No employees found.</span>}
              </div>
              {form.employee && (
                <button type="button" onClick={() => set('employee', '')} style={{ ...miniBtn, marginTop: 8 }}>Unlink</button>
              )}
            </Section>
          )}

          {/* Basic */}
          <Section title="Basic Details">
            <Grid2>
              <Field label="Full Name" required><input required value={form.fullName} onChange={input('fullName')} style={inp} /></Field>
              <Field label="Employee / Resource ID"><input value={form.employeeCode} onChange={input('employeeCode')} placeholder="e.g. STS-042" style={inp} /></Field>
              <Field label="Designation"><input value={form.designation} onChange={input('designation')} placeholder="e.g. Senior React Developer" style={inp} /></Field>
              <Field label="Experience (years)"><input type="number" min="0" max="60" step="0.5" value={form.experienceYears} onChange={input('experienceYears')} style={inp} /></Field>
              <Field label="Primary Technology"><input value={form.primaryTechnology} onChange={input('primaryTechnology')} placeholder="e.g. React" style={inp} /></Field>
              <Field label="Secondary Technology"><input value={form.secondaryTechnology} onChange={input('secondaryTechnology')} placeholder="e.g. Node.js" style={inp} /></Field>
              <Field label="Current Company"><input value={form.currentCompany} onChange={input('currentCompany')} style={inp} /></Field>
              <Field label="Location"><input value={form.location} onChange={input('location')} placeholder="e.g. Bengaluru, India" style={inp} /></Field>
              <Field label="Time Zone"><input value={form.timeZone} onChange={input('timeZone')} placeholder="e.g. IST (UTC+5:30)" style={inp} /></Field>
              <Field label="Availability Status">
                <select value={form.availabilityStatus} onChange={input('availabilityStatus')} style={inp}>
                  {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </Grid2>
            <Field label="Skills (comma-separated)">
              <textarea value={form.skills} onChange={input('skills')} rows={2} placeholder="React, TypeScript, Node.js, MongoDB…" style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
            </Field>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {SKILL_SUGGESTIONS.slice(0, 20).map(sk => {
                const current = form.skills.split(',').map(x => x.trim()).filter(Boolean);
                const active = current.some(c => c.toLowerCase() === sk.toLowerCase());
                return (
                  <button key={sk} type="button" onClick={() => {
                    if (active) set('skills', current.filter(c => c.toLowerCase() !== sk.toLowerCase()).join(', '));
                    else set('skills', [...current, sk].join(', '));
                  }} style={{
                    padding: '3px 9px', fontSize: 11, cursor: 'pointer', borderRadius: 99,
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                    background: active ? 'var(--accent-soft)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--fg-4)',
                  }}>{active ? '✓ ' : '+ '}{sk}</button>
                );
              })}
            </div>
            {/* Profile photo */}
            <Field label="Profile Photo">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {form.profilePhotoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={form.profilePhotoUrl} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }} />
                  : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--line)' }} />}
                <label style={fileBtn}>
                  {uploadingPhoto ? 'Uploading…' : 'Upload photo'}
                  <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                </label>
                {form.profilePhotoUrl && <button type="button" onClick={() => set('profilePhotoUrl', '')} style={miniBtn}>Remove</button>}
              </div>
            </Field>
          </Section>

          {/* Professional */}
          <Section title="Professional Details">
            <Field label="Professional Summary">
              <textarea value={form.summary} onChange={input('summary')} rows={4} placeholder="A concise overview of the candidate's strengths and focus areas…" style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </Field>
            <Grid2>
              <Field label="Portfolio URL"><input value={form.portfolioUrl} onChange={input('portfolioUrl')} placeholder="https://…" style={inp} /></Field>
              <Field label="LinkedIn URL"><input value={form.linkedinUrl} onChange={input('linkedinUrl')} placeholder="https://linkedin.com/in/…" style={inp} /></Field>
              <Field label="GitHub URL"><input value={form.githubUrl} onChange={input('githubUrl')} placeholder="https://github.com/…" style={inp} /></Field>
              <Field label="English Level">
                <select value={form.englishLevel} onChange={input('englishLevel')} style={inp}>
                  <option value="">—</option>
                  {ENGLISH_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Notice Period"><input value={form.noticePeriod} onChange={input('noticePeriod')} placeholder="e.g. Immediate, 2 weeks, 30 days" style={inp} /></Field>
              <Field label="Expected Joining Date"><input type="date" value={form.expectedJoiningDate} onChange={input('expectedJoiningDate')} style={inp} /></Field>
            </Grid2>
            <Field label="Resume (PDF / DOC / DOCX)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <label style={fileBtn}>
                  {uploadingResume ? 'Uploading…' : form.resumeUrl ? 'Replace resume' : 'Upload resume'}
                  <input type="file" accept=".pdf,.doc,.docx" hidden onChange={e => e.target.files?.[0] && uploadResume(e.target.files[0])} />
                </label>
                {form.resumeUrl && (
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                    ✓ {form.resumeName || 'resume'} {form.resumeSize ? `(${Math.round(form.resumeSize / 1024)} KB)` : ''}
                  </span>
                )}
                {form.resumeUrl && <button type="button" onClick={() => setForm(p => ({ ...p, resumeUrl: '', resumeName: '', resumeType: '', resumeSize: 0 }))} style={miniBtn}>Remove</button>}
              </div>
            </Field>
          </Section>

          {/* Repeatable: Certifications */}
          <RepeatSection
            title="Certifications"
            items={form.certifications}
            onAdd={() => set('certifications', [...form.certifications, { name: '', issuer: '', date: '' }])}
            onRemove={i => set('certifications', form.certifications.filter((_, x) => x !== i))}
            render={(c, i) => (
              <Grid3>
                <input placeholder="Certification name" value={c.name} onChange={e => updateItem(form, set, 'certifications', i, { name: e.target.value })} style={inp} />
                <input placeholder="Issuer" value={c.issuer} onChange={e => updateItem(form, set, 'certifications', i, { issuer: e.target.value })} style={inp} />
                <input placeholder="Year / date" value={c.date} onChange={e => updateItem(form, set, 'certifications', i, { date: e.target.value })} style={inp} />
              </Grid3>
            )}
          />

          {/* Repeatable: Work Experience */}
          <RepeatSection
            title="Work Experience"
            items={form.workExperience}
            onAdd={() => set('workExperience', [...form.workExperience, { company: '', role: '', location: '', startDate: '', endDate: '', current: false, description: '', responsibilities: [] }])}
            onRemove={i => set('workExperience', form.workExperience.filter((_, x) => x !== i))}
            render={(w, i) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Grid2>
                  <input placeholder="Role" value={w.role} onChange={e => updateItem(form, set, 'workExperience', i, { role: e.target.value })} style={inp} />
                  <input placeholder="Company" value={w.company} onChange={e => updateItem(form, set, 'workExperience', i, { company: e.target.value })} style={inp} />
                  <input placeholder="Location" value={w.location} onChange={e => updateItem(form, set, 'workExperience', i, { location: e.target.value })} style={inp} />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input placeholder="Start (e.g. 2021)" value={w.startDate} onChange={e => updateItem(form, set, 'workExperience', i, { startDate: e.target.value })} style={{ ...inp, flex: 1 }} />
                    <input placeholder="End" value={w.endDate} disabled={w.current} onChange={e => updateItem(form, set, 'workExperience', i, { endDate: e.target.value })} style={{ ...inp, flex: 1, opacity: w.current ? 0.5 : 1 }} />
                  </div>
                </Grid2>
                <label style={{ fontSize: 12, color: 'var(--fg-3)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={w.current} onChange={e => updateItem(form, set, 'workExperience', i, { current: e.target.checked })} /> Currently working here
                </label>
                <textarea placeholder="Short description" value={w.description} onChange={e => updateItem(form, set, 'workExperience', i, { description: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
                <textarea placeholder="Responsibilities (one per line)" value={(w.responsibilities ?? []).join('\n')} onChange={e => updateItem(form, set, 'workExperience', i, { responsibilities: e.target.value.split('\n') })} rows={3} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            )}
          />

          {/* Repeatable: Projects */}
          <RepeatSection
            title="Projects"
            items={form.projects}
            onAdd={() => set('projects', [...form.projects, { name: '', description: '', role: '', duration: '', link: '', technologies: [] }])}
            onRemove={i => set('projects', form.projects.filter((_, x) => x !== i))}
            render={(p, i) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Grid2>
                  <input placeholder="Project name" value={p.name} onChange={e => updateItem(form, set, 'projects', i, { name: e.target.value })} style={inp} />
                  <input placeholder="Role" value={p.role} onChange={e => updateItem(form, set, 'projects', i, { role: e.target.value })} style={inp} />
                  <input placeholder="Duration" value={p.duration} onChange={e => updateItem(form, set, 'projects', i, { duration: e.target.value })} style={inp} />
                  <input placeholder="Link" value={p.link} onChange={e => updateItem(form, set, 'projects', i, { link: e.target.value })} style={inp} />
                </Grid2>
                <textarea placeholder="Description" value={p.description} onChange={e => updateItem(form, set, 'projects', i, { description: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
                <input placeholder="Technologies (comma-separated)" value={(p.technologies ?? []).join(', ')} onChange={e => updateItem(form, set, 'projects', i, { technologies: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} style={inp} />
              </div>
            )}
          />

          {/* Repeatable: Education */}
          <RepeatSection
            title="Education"
            items={form.education}
            onAdd={() => set('education', [...form.education, { institution: '', degree: '', field: '', startDate: '', endDate: '', grade: '' }])}
            onRemove={i => set('education', form.education.filter((_, x) => x !== i))}
            render={(ed, i) => (
              <Grid2>
                <input placeholder="Degree" value={ed.degree} onChange={e => updateItem(form, set, 'education', i, { degree: e.target.value })} style={inp} />
                <input placeholder="Field of study" value={ed.field} onChange={e => updateItem(form, set, 'education', i, { field: e.target.value })} style={inp} />
                <input placeholder="Institution" value={ed.institution} onChange={e => updateItem(form, set, 'education', i, { institution: e.target.value })} style={inp} />
                <input placeholder="Grade / GPA" value={ed.grade} onChange={e => updateItem(form, set, 'education', i, { grade: e.target.value })} style={inp} />
                <input placeholder="Start (e.g. 2016)" value={ed.startDate} onChange={e => updateItem(form, set, 'education', i, { startDate: e.target.value })} style={inp} />
                <input placeholder="End (e.g. 2020)" value={ed.endDate} onChange={e => updateItem(form, set, 'education', i, { endDate: e.target.value })} style={inp} />
              </Grid2>
            )}
          />

          {error && <div style={errBox}>{error}</div>}
        </form>

        <div style={panelFoot}>
          <button type="button" onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={saving} style={btnPrimary}>{saving ? 'Saving…' : target ? 'Save Changes' : 'Add Resource'}</button>
        </div>
      </div>
    </div>
  );
}

// Immutably patch one item in a repeatable array field.
function updateItem<K extends 'certifications' | 'workExperience' | 'projects' | 'education'>(
  form: FormState,
  set: <F extends keyof FormState>(k: F, v: FormState[F]) => void,
  key: K,
  index: number,
  patch: Partial<FormState[K][number]>,
) {
  const next = (form[key] as FormState[K][number][]).map((it, i) => (i === index ? { ...it, ...patch } : it));
  set(key, next as FormState[K]);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}

function RepeatSection<T>({ title, items, onAdd, onRemove, render }: {
  title: string; items: T[]; onAdd: () => void; onRemove: (i: number) => void; render: (item: T, i: number) => React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{title}</div>
        <button type="button" onClick={onAdd} style={miniBtn}>+ Add</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: 12, position: 'relative', background: 'var(--bg-1)' }}>
            <button type="button" onClick={() => onRemove(i)} style={{ position: 'absolute', top: 8, right: 8, ...miniBtn, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>Remove</button>
            <div style={{ paddingTop: 4 }}>{render(it, i)}</div>
          </div>
        ))}
        {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>None added yet.</div>}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>{label}{required && <span style={{ color: '#f87171' }}> *</span>}</label>
      {children}
    </div>
  );
}

const Grid2 = ({ children }: { children: React.ReactNode }) => <div className="rf-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
const Grid3 = ({ children }: { children: React.ReactNode }) => <div className="rf-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>{children}</div>;

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 };
const panel: React.CSSProperties = { background: 'var(--bg-1)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', width: 760, maxWidth: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const panelHead: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--line)' };
const panelFoot: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--line)', background: 'var(--bg-1)' };
const inp: React.CSSProperties = { padding: '8px 11px', fontSize: 13, color: 'var(--fg)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', outline: 'none', width: '100%', boxSizing: 'border-box' };
const xBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--fg-3)', fontSize: 16, cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { padding: '9px 18px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const btnGhost: React.CSSProperties = { padding: '9px 18px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const miniBtn: React.CSSProperties = { padding: '4px 10px', fontSize: 11, color: 'var(--fg-3)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer' };
const fileBtn: React.CSSProperties = { padding: '7px 14px', fontSize: 12, fontWeight: 500, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--r-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' };
const errBox: React.CSSProperties = { padding: '9px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#f87171' };
