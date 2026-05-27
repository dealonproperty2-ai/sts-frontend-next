import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import Icon from '@/components/Icon';
import { CornerTicks, Eyebrow, SectionHead, SpecLine } from '@/components/Primitives';
import { Reveal, TiltCard } from '@/components/Parallax';
import { Breadcrumb } from '@/components/Breadcrumb';
import CTABanner from '@/components/CTABanner';
import { CURRICULUM_WEBDEV } from '@/lib/courses';
import { connectDb } from '@/server/db';
import Course from '@/server/models/Course';
import { SITE, COURSE_KEYWORDS, buildFAQSchema, buildBreadcrumbSchema } from '@/lib/seo';

export const revalidate = 60;

interface Params {
  params: { slug: string };
}

const getCourse = cache(async (slug: string) => {
  await connectDb();
  return Course.findOne({ slug, isActive: true }).lean();
});

export async function generateStaticParams() {
  try {
    await connectDb();
    const courses = await Course.find({ isActive: true }).select('slug').lean();
    return courses.map((c) => ({ slug: c.slug }));
  } catch {
    return ['webdev', 'frontend', 'backend', 'angular', 'devops', 'qa'].map((slug) => ({ slug }));
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const course = await getCourse(params.slug);
  if (!course) return { title: 'Course not found' };

  const isWebdev = course.slug === 'webdev';
  const keywordsExtra = isWebdev
    ? [
        'MERN stack bootcamp India',
        'full stack web development course India',
        'learn MERN stack online',
        'React.js and Node.js course',
        'HTML CSS JavaScript React Node bootcamp',
      ]
    : [];

  return {
    title: `${course.title} — ${course.dur} | Step To Soft Academy`,
    description: `${course.desc} Live cohort, 1-on-1 mentorship, real projects, and job-placement support. Enroll in the next Q3 batch at Step To Soft Academy.`,
    keywords: [...COURSE_KEYWORDS, ...keywordsExtra, course.title, course.stack],
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: {
      url: `/courses/${course.slug}`,
      type: 'website',
      title: `${course.title} — ${course.dur} | Step To Soft Academy`,
      description: `${course.desc} Live cohort, 1-on-1 mentors, real projects, job-placement support.`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${course.title} — ${course.dur} | Step To Soft Academy`,
      description: `${course.desc} Live cohort, 1-on-1 mentors, job-placement support.`,
    },
  };
}

export default async function CourseDetailPage({ params }: Params) {
  const course = await getCourse(params.slug);
  if (!course) notFound();

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${SITE.url}/courses/${course.slug}`,
    name: course.title,
    description: course.longDesc,
    url: `${SITE.url}/courses/${course.slug}`,
    image: `${SITE.url}/opengraph-image`,
    inLanguage: 'en',
    educationalLevel: 'Beginner to Advanced',
    teaches: course.stack,
    coursePrerequisites: course.slug === 'webdev' ? 'None — no prior coding experience required' : 'Basic programming knowledge recommended',
    skillLevel: course.slug === 'devops' || course.slug === 'qa' ? 'Intermediate' : 'Beginner',
    educationalCredentialAwarded: 'Step To Soft Academy Certificate of Completion',
    provider: {
      '@type': 'Organization',
      '@id': `${SITE.url}/#organization`,
      name: 'Step To Soft Academy',
      sameAs: SITE.url,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      courseWorkload: `PT${course.classes}H`,
      inLanguage: 'en',
      startDate: '2026-07-01',
      endDate: '2027-01-31',
      instructor: {
        '@type': 'Person',
        name: 'Step To Soft Senior Engineer',
        worksFor: { '@type': 'Organization', name: 'Step To Soft' },
      },
      courseSchedule: {
        '@type': 'Schedule',
        byDay: ['Monday', 'Wednesday', 'Friday'],
        repeatFrequency: 'P1W',
        repeatCount: course.weeks,
      },
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: course.priceInr,
      availability: 'https://schema.org/InStock',
      category: 'Tuition',
      url: `${SITE.url}/careers`,
      validThrough: '2026-12-31',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '36',
      bestRating: '5',
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbSchema([
    { name: 'Home', url: SITE.url },
    { name: 'Courses', url: `${SITE.url}/courses` },
    { name: course.title, url: `${SITE.url}/courses/${course.slug}` },
  ]);

  const courseFaqJsonLd = buildFAQSchema([
    {
      q: `What will I learn in the ${course.title} course?`,
      a: `The ${course.title} course covers ${course.stack}. ${course.longDesc} The course runs for ${course.weeks} weeks with ${course.classes} live classes and includes 1-on-1 weekly mentorship, real portfolio projects, and job-placement support.`,
    },
    {
      q: `How long is the ${course.title} course and how many classes are there?`,
      a: `The ${course.title} course is ${course.weeks} weeks long with ${course.classes} live online classes conducted 3 times per week. All sessions are recorded for replay.`,
    },
    {
      q: `What is the fee for the ${course.title} course?`,
      a: `The fee for ${course.title} is ${course.price}. EMI options are available. Contact us for details on scholarships and payment plans.`,
    },
    {
      q: `Is there a job placement guarantee after the ${course.title} course?`,
      a: `Step To Soft Academy provides active placement support including mock interviews, resume review, LinkedIn optimisation, and introductions to our hiring partner network. Our last three cohorts achieved a 78% placement rate within 90 days of graduation.`,
    },
    {
      q: `Who are the instructors for the ${course.title} course?`,
      a: `All instructors are working engineers at Step To Soft who actively ship client software. They bring real-world industry experience to every class — not just theory. Mentors have 5+ years of experience in their respective domains.`,
    },
  ]);

  const useCurriculum = course.slug === 'webdev';

  return (
    <div className="page-enter">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseFaqJsonLd) }} />

      <section style={{ paddingTop: 160, paddingBottom: 64, position: 'relative', overflow: 'hidden' }}>
        <div className="blueprint" />
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '50%',
            height: '60%',
            background: 'radial-gradient(closest-side, var(--accent-glow), transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.5,
          }}
        />
        <div className="container course-hero" style={{ position: 'relative' }}>
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', href: '/' },
                { label: 'Courses', href: '/courses' },
                { label: course.title },
              ]}
            />
            <div style={{ marginTop: 16 }}>
              <Eyebrow>{course.tag} · {course.dur}</Eyebrow>
            </div>
            <h1 style={{ marginTop: 24 }}>{course.title}</h1>
            <p className="lead" style={{ marginTop: 24 }}>
              {course.longDesc}
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 36, flexWrap: 'wrap' }}>
              <Link href="/careers#apply" className="btn btn-primary">
                Apply for Q3 cohort <Icon name="arrow" size={14} />
              </Link>
              <Link href="/contact" className="btn btn-ghost">
                <Icon name="book" size={14} /> Talk to admissions
              </Link>
            </div>
          </div>
          <TiltCard max={6}>
            <div className="card ticked" style={{ padding: 28 }}>
              <CornerTicks />
              <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
                Course spec
              </div>
              <SpecLine label="Duration" value={`${course.weeks} weeks`} />
              <SpecLine label="Classes" value={`${course.classes} live`} />
              <SpecLine label="Mentor" value="1-on-1, weekly" />
              <SpecLine label="Cohort size" value={`${course.seats} seats`} />
              <SpecLine label="Stack" value={course.stack} />
              <SpecLine label="Mode" value="Online + recordings" />
              <SpecLine label="Fee" value={`${course.price} (EMI ok)`} />
              <SpecLine label="Next start" value="Q3 · 2026" />
            </div>
          </TiltCard>
        </div>
      </section>

      {useCurriculum && (
        <section className="section">
          <div className="container">
            <SectionHead
              eyebrow="Curriculum"
              title="Six modules. Twenty-eight weeks."
              sub="Built from the ground up — no prior coding required. Every module ends with a real project deployed to a live URL."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {CURRICULUM_WEBDEV.map((m, i) => (
                <Reveal key={m.title} delay={i * 50}>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="cur-row" style={{ alignItems: 'stretch' }}>
                      <div style={{ padding: 24, borderRight: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className="mono" style={{ fontSize: 32, color: 'var(--accent)', opacity: 0.6, letterSpacing: '-0.03em' }}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                            {m.months}
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: 24, borderRight: '1px solid var(--line)' }}>
                        <h3 style={{ fontSize: 22, marginBottom: 8 }}>{m.title}</h3>
                        <span className="chip" style={{ padding: '3px 8px', fontSize: 10 }}>
                          {m.sessions}
                        </span>
                      </div>
                      <div style={{ padding: 24, borderRight: '1px solid var(--line)' }}>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                          {m.topics.map((t) => (
                            <li key={t} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--fg-2)' }}>
                              <span style={{ color: 'var(--accent)' }}>—</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-1)' }}>
                        <Icon name="check" size={24} stroke={1.5} />
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ background: 'var(--bg-1)', borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div className="about-grid">
            <div>
              <Eyebrow>What you walk away with</Eyebrow>
              <h2 style={{ marginTop: 20, marginBottom: 24 }}>
                A portfolio. A network. A job-ready stack.
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  '3 portfolio projects + capstone deployed live',
                  'Personal website + GitHub of all coursework',
                  'Recommendation letter from mentor',
                  'Mock interviews + resume review',
                  'Intro to our hiring partner network',
                  'Lifetime access to recordings + alumni Slack',
                ].map((b) => (
                  <li key={b} style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--fg-2)' }}>
                    <Icon name="check" size={18} stroke={2} /> {b}
                  </li>
                ))}
              </ul>
            </div>
            <TiltCard max={5}>
              <div className="card ticked" style={{ padding: 28 }}>
                <CornerTicks />
                <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 18 }}>
                  Outcome stats · Last 3 cohorts
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  {[
                    ['92%', 'Completion rate'],
                    ['78%', 'Placed in 90 days'],
                    ['₹4.8L', 'Avg first salary'],
                    ['4.9/5', 'Cohort rating'],
                  ].map(([n, l]) => (
                    <div key={l} style={{ borderLeft: '1px solid var(--accent-edge)', paddingLeft: 14 }}>
                      <div style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em' }}>{n}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
                        {l}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      <CTABanner />
    </div>
  );
}
