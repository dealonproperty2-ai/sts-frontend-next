import { NextResponse } from 'next/server';
import { COURSES } from '@/lib/courses';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    { success: true, data: COURSES },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
  );
}
