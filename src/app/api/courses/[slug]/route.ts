import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import Course from '@/server/models/Course';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  try {
    await connectDb();
    const course = await Course.findOne({ slug: params.slug, isActive: true }).lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: course },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (err) {
    console.error('[api/courses/:slug GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
