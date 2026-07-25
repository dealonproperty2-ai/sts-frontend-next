import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/server/adminAuth';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { uploadDir } from '@/server/resourceHelpers';

export const runtime = 'nodejs';

const RESUME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let formData: FormData;
  try { formData = await req.formData(); } catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }); }

  const file = formData.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const kind = String(formData.get('kind') ?? 'resume');
  const allowed = kind === 'image' ? IMAGE_TYPES : RESUME_TYPES;
  const ext = allowed[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: kind === 'image' ? 'Image must be JPEG, PNG, or WebP.' : 'Resume must be PDF, DOC, or DOCX.' },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 400 });

  try {
    const dir = uploadDir();
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({
      success: true,
      fileUrl: `/api/admin/resources/file/${filename}`,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (err) {
    console.error('[admin/resources/upload POST]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
