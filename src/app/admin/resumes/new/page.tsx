'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, AdminResume } from '@/lib/adminApi';
import ResumeForm from '@/components/resume/ResumeForm';

export default function NewResumePage() {
  const router = useRouter();

  async function handleSubmit(payload: Partial<AdminResume>) {
    const res = await adminApi.createResume(payload);
    router.push(`/admin/resumes/${res.data._id}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link href="/admin/resumes" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--fg-3)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', textDecoration: 'none' }}>← Back</Link>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--fg)' }}>New Resume</h1>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <ResumeForm
          submitLabel="Create Resume"
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/resumes')}
        />
      </div>
    </div>
  );
}
