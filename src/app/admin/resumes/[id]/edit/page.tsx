'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, AdminResume } from '@/lib/adminApi';
import ResumeForm from '@/components/resume/ResumeForm';

export default function EditResumePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [resume, setResume] = useState<AdminResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    adminApi.getResume(id)
      .then(res => { if (active) setResume(res.data); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Failed to load'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function handleSubmit(payload: Partial<AdminResume>) {
    await adminApi.updateResume(id, payload);
    router.push(`/admin/resumes/${id}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link href={`/admin/resumes/${id}`} style={{ padding: '6px 12px', fontSize: 12, color: 'var(--fg-3)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', textDecoration: 'none' }}>← Back</Link>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--fg)' }}>
          Edit Resume{resume ? ` — ${resume.fullName}` : ''}
        </h1>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        ) : resume ? (
          <ResumeForm
            initial={resume}
            submitLabel="Save Changes"
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/admin/resumes/${id}`)}
          />
        ) : null}
      </div>
    </div>
  );
}
