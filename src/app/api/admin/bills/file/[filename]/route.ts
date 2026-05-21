import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/server/adminAuth';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export async function GET(
  req: Request,
  { params }: { params: { filename: string } }
) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  // Sanitize — reject any path traversal attempts
  const filename = path.basename(params.filename);
  if (!filename || /[/\\]/.test(filename) || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  // Mirror the upload path: /tmp in production, local uploads/ in dev
  const uploadDir = process.env.NODE_ENV === 'production'
    ? path.join('/tmp', 'bills')
    : path.join(process.cwd(), 'uploads', 'bills');
  const filePath = path.join(uploadDir, filename);

  try {
    await stat(filePath);
    const buffer = await readFile(filePath);
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
