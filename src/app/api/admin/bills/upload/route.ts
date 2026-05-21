import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/server/adminAuth';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'File type not allowed. Use JPEG, PNG, WebP, or PDF.' },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 10 MB.' },
      { status: 400 }
    );
  }

  try {
    const uploadDir = path.join(process.cwd(), 'uploads', 'bills');
    await mkdir(uploadDir, { recursive: true });

    const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(rawExt)
      ? rawExt
      : 'bin';
    const filename = `${Date.now()}-${randomBytes(8).toString('hex')}.${safeExt}`;
    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      success: true,
      fileUrl: `/api/admin/bills/file/${filename}`,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (err) {
    console.error('[admin/bills/upload POST]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
