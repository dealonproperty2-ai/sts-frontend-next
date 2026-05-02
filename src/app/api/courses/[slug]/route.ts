import { NextResponse } from 'next/server';
import { findCourse } from '@/lib/courses';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const course = findCourse(params.slug);
  if (!course) {
    return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
  }
  return NextResponse.json(
    { success: true, data: course },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
  );
}
