import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/server/adminAuth';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PATHS = ['/courses', '/'] as const;

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* default to all paths */ }

  const requested = typeof body.path === 'string' ? body.path : null;
  const paths: string[] = requested && VALID_PATHS.includes(requested as typeof VALID_PATHS[number])
    ? [requested]
    : [...VALID_PATHS];

  for (const p of paths) {
    revalidatePath(p);
  }

  audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'UPDATE', resource: 'cache', details: { paths }, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });

  return NextResponse.json({ success: true, revalidated: paths });
}
