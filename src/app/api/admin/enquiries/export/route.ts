import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Enquiry from '@/server/models/Enquiry';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvEscape(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';

  const filter: Record<string, unknown> = { deletedAt: null };
  if (status) filter.status = status;
  if (search) {
    const re = { $regex: search, $options: 'i' };
    filter.$or = [{ name: re }, { email: re }, { service: re }, { country: re }];
  }

  try {
    await connectDb();
    const docs = await Enquiry.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

    const headers = ['Name', 'Email', 'Phone', 'Country', 'Service', 'Budget', 'Message', 'Status', 'Submitted At'];
    const rows = docs.map((d) => [
      csvEscape(d.name), csvEscape(d.email), csvEscape(d.phone), csvEscape(d.country),
      csvEscape(d.service), csvEscape(d.budget), csvEscape(d.message), csvEscape(d.status),
      csvEscape(new Date(d.createdAt as Date).toISOString()),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    const filename = `enquiries-${new Date().toISOString().slice(0, 10)}.csv`;

    audit({ adminId: auth.payload.id, adminEmail: auth.payload.email ?? '', action: 'EXPORT', resource: 'enquiry', details: { count: docs.length }, ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[admin/enquiries/export]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
