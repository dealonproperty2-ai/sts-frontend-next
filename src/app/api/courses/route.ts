import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import Course from '@/server/models/Course';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDb();
    const courses = await Course.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return NextResponse.json(
      { success: true, data: courses },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (err) {
    console.error('[api/courses GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
