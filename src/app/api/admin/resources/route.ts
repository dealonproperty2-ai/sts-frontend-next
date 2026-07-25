import { NextResponse } from 'next/server';
import { connectDb } from '@/server/db';
import { verifyAdmin } from '@/server/adminAuth';
import Resource from '@/server/models/Resource';
import { buildResource, isAvailabilityStatus, isResourceType, parseList } from '@/server/resourceHelpers';
import { scoreResource, hasRequirement, type ResourceRequirement } from '@/lib/resourceMatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SORTS: Record<string, Record<string, 1 | -1>> = {
  recent:     { updatedAt: -1 },
  name:       { fullName: 1 },
  experience: { experienceYears: -1 },
};

// Cap for in-memory match scoring so a huge bench can't blow up a request.
const MATCH_SCAN_LIMIT = 800;

export async function GET(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '12', 10)));
  const search = searchParams.get('search') ?? '';
  const scope = searchParams.get('scope') ?? 'all';          // internal | external | all
  const availabilityStatus = searchParams.get('availabilityStatus') ?? '';
  const minExperience = parseFloat(searchParams.get('minExperience') ?? '');
  const location = searchParams.get('location') ?? '';
  const primaryTechnology = searchParams.get('primaryTechnology') ?? '';
  const filterSkills = parseList(searchParams.get('skills'), 30, 60);
  const archived = searchParams.get('archived') === 'true';
  const sort = SORTS[searchParams.get('sort') ?? 'recent'] ?? SORTS.recent;

  // Requirement (match mode) — separate from plain filters.
  const requirement: ResourceRequirement = {
    technology: searchParams.get('reqTechnology') || undefined,
    skills: searchParams.get('reqSkills') ? parseList(searchParams.get('reqSkills'), 30, 60) : undefined,
    minExperience: searchParams.get('reqMinExp') ? Number(searchParams.get('reqMinExp')) : undefined,
    availability: searchParams.get('reqAvailability') || undefined,
    maxNoticePeriodDays: searchParams.get('reqNoticeDays') ? Number(searchParams.get('reqNoticeDays')) : undefined,
    location: searchParams.get('reqLocation') || undefined,
  };
  const matchMode = hasRequirement(requirement);

  const filter: Record<string, unknown> = { archivedAt: archived ? { $ne: null } : null };
  if (scope === 'internal' || scope === 'external') filter.resourceType = scope;
  if (availabilityStatus && isAvailabilityStatus(availabilityStatus)) filter.availabilityStatus = availabilityStatus;
  if (Number.isFinite(minExperience) && minExperience > 0) filter.experienceYears = { $gte: minExperience };
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (primaryTechnology) filter.primaryTechnology = { $regex: primaryTechnology, $options: 'i' };
  if (filterSkills.length) filter.skills = { $all: filterSkills.map((s) => new RegExp(`^${s}$`, 'i')) };
  if (search) {
    const re = { $regex: search, $options: 'i' };
    filter.$or = [{ fullName: re }, { skills: re }, { primaryTechnology: re }, { designation: re }, { employeeCode: re }];
  }

  try {
    await connectDb();

    if (matchMode) {
      // Score in memory so the same weighted algorithm drives sort + UI breakdown.
      const docs = await Resource.find(filter).limit(MATCH_SCAN_LIMIT).lean();
      const scored = docs
        .map((d) => ({ ...d, match: scoreResource(d, requirement) }))
        .filter((d) => d.match.score > 0)
        .sort((a, b) => b.match.score - a.match.score);
      const total = scored.length;
      const start = (page - 1) * limit;
      return NextResponse.json({
        success: true,
        data: scored.slice(start, start + limit),
        meta: { total, page, limit, pages: Math.ceil(total / limit), matchMode: true, scope },
      });
    }

    const [total, docs] = await Promise.all([
      Resource.countDocuments(filter),
      Resource.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return NextResponse.json({
      success: true,
      data: docs,
      meta: { total, page, limit, pages: Math.ceil(total / limit), matchMode: false, scope },
    });
  } catch (err) {
    console.error('[admin/resources GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const built = buildResource(body, { partial: false });
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });

  try {
    await connectDb();
    const doc = await Resource.create(built.data);
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    console.error('[admin/resources POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
