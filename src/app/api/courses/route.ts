import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import Course from '@/server/models/Course';
import { COURSES } from '@/lib/courses';

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
    // DB unavailable (no MONGODB_URI in dev, or a transient outage) — serve the
    // static catalog so the endpoint degrades gracefully instead of 500ing.
    console.warn('[api/courses GET] DB unavailable, using static catalog:', (err as Error).message);
    return NextResponse.json({ success: true, data: COURSES });
  }
}
