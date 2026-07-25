import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/server/adminAuth';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { uploadDir } from '@/server/resourceHelpers';

export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg',
};

export async function GET(req: Request, { params }: { params: { filename: string } }) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const filename = path.basename(params.filename);
  if (!filename || /[/\\]/.test(filename) || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }
  const filePath = path.join(uploadDir(), filename);
  try {
    await stat(filePath);
    const buffer = await readFile(filePath);
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
