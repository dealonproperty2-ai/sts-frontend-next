import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import path from 'path';
import { readFile } from 'fs/promises';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Resource from '@/server/models/Resource';
import { uploadDir } from '@/server/resourceHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const safe = (s: string) => (s || 'resource').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'resource';

// Bundles the uploaded resume files for the selected resources into one ZIP.
export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: { ids?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => mongoose.Types.ObjectId.isValid(String(x))) : [];
  if (!ids.length) return NextResponse.json({ error: 'No resources selected' }, { status: 400 });

  try {
    await connectDb();
    const rows = await Resource.find({ _id: { $in: ids } }).lean();

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    let added = 0;
    const used = new Set<string>();

    for (const r of rows) {
      if (!r.resumeUrl) continue;
      const filename = path.basename(r.resumeUrl);
      if (!filename || filename.includes('..')) continue;
      try {
        const buf = await readFile(path.join(uploadDir(), filename));
        const ext = (r.resumeName?.split('.').pop() || filename.split('.').pop() || 'pdf').toLowerCase();
        let name = `${safe(r.fullName || 'resource')}-Resume.${ext}`;
        let n = 2;
        while (used.has(name)) name = `${safe(r.fullName || 'resource')}-Resume-${n++}.${ext}`;
        used.add(name);
        zip.file(name, buf);
        added += 1;
      } catch { /* file missing on disk — skip */ }
    }

    if (!added) return NextResponse.json({ error: 'None of the selected resources have a resume file' }, { status: 400 });

    const buf = Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }));
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="STS-Resumes-${stamp}.zip"`,
      },
    });
  } catch (err) {
    console.error('[admin/resources/zip POST]', err);
    return NextResponse.json({ error: 'ZIP failed' }, { status: 500 });
  }
}
