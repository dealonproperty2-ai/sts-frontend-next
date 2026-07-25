import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Resource from '@/server/models/Resource';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLUMNS: { header: string; get: (r: Record<string, unknown>) => string }[] = [
  { header: 'Full Name', get: (r) => String(r.fullName ?? '') },
  { header: 'Employee Code', get: (r) => String(r.employeeCode ?? '') },
  { header: 'Type', get: (r) => String(r.resourceType ?? '') },
  { header: 'Designation', get: (r) => String(r.designation ?? '') },
  { header: 'Experience (yrs)', get: (r) => String(r.experienceYears ?? 0) },
  { header: 'Primary Technology', get: (r) => String(r.primaryTechnology ?? '') },
  { header: 'Secondary Technology', get: (r) => String(r.secondaryTechnology ?? '') },
  { header: 'Skills', get: (r) => (Array.isArray(r.skills) ? (r.skills as string[]).join(', ') : '') },
  { header: 'Availability', get: (r) => String(r.availabilityStatus ?? '') },
  { header: 'Current Company', get: (r) => String(r.currentCompany ?? '') },
  { header: 'Location', get: (r) => String(r.location ?? '') },
  { header: 'Time Zone', get: (r) => String(r.timeZone ?? '') },
  { header: 'Notice Period', get: (r) => String(r.noticePeriod ?? '') },
  { header: 'Expected Joining', get: (r) => String(r.expectedJoiningDate ?? '') },
  { header: 'English', get: (r) => String(r.englishLevel ?? '') },
  { header: 'Portfolio', get: (r) => String(r.portfolioUrl ?? '') },
  { header: 'LinkedIn', get: (r) => String(r.linkedinUrl ?? '') },
  { header: 'GitHub', get: (r) => String(r.githubUrl ?? '') },
];

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: { ids?: unknown; format?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const format = body.format === 'excel' ? 'excel' : 'csv';
  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => mongoose.Types.ObjectId.isValid(String(x))) : [];

  try {
    await connectDb();
    const filter = ids.length ? { _id: { $in: ids } } : { archivedAt: null };
    const rows = await Resource.find(filter).limit(2000).lean();
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'excel') {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Resources');
      ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.header, width: 22 }));
      ws.getRow(1).font = { bold: true };
      for (const r of rows) ws.addRow(COLUMNS.map((c) => c.get(r as Record<string, unknown>)));
      const buf = Buffer.from(await wb.xlsx.writeBuffer());
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="STS-Resources-${stamp}.xlsx"`,
        },
      });
    }

    const lines = [COLUMNS.map((c) => c.header).join(',')];
    for (const r of rows) lines.push(COLUMNS.map((c) => csvCell(c.get(r as Record<string, unknown>))).join(','));
    return new NextResponse('﻿' + lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="STS-Resources-${stamp}.csv"`,
      },
    });
  } catch (err) {
    console.error('[admin/resources/export POST]', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
