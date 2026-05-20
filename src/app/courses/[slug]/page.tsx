import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import { CornerTicks, Eyebrow, SectionHead, SpecLine } from '@/components/Primitives';
import { Reveal, TiltCard } from '@/components/Parallax';
import CTABanner from '@/components/CTABanner';
import { COURSES, CURRICULUM_WEBDEV, findCourse } from '@/lib/courses';

const SITE_URL = process.env.SITE_URL || 'https://steptosoft.com';

interface Params {
  params: { slug: string };
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return COURSES.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const course = findCourse(params.slug);
  if (!course) return { title: 'Course not found' };
  return {
    title: `${course.title} — ${course.dur}`,
    description: course.desc,
    alternates: { canonical: `/courses/${course.id}` },
    openGraph: {
      url: `/courses/${course.id}`,
      title: `${course.title} — Step To Soft Academy`,
      description: course.desc,
    },
  };
}

export default function CourseDetailPage({ params }: Params) {
  const course = findCourse(params.slug);
  if (!course) notFound();

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.longDesc,
    url: `${SITE_URL}/courses/${course.id}`,
    provider: {
      '@type': 'Organization',
      name: 'Step To Soft Academy',
      sameAs: SITE_URL,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      courseWorkload: `PT${course.classes}H`,
      inLanguage: 'en',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: course.priceInr,
      availability: 'https://schema.org/InStock',
      category: 'Tuition',
    },
  };

  const useCurriculum = course.id === 'webdev';

  return (
    <div className="page-enter">
      <Script
        id={`ld-course-${course.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
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
            <Link
              href="/courses"
              className="link-u mono"
              style={{
                fontSize: 11,
                color: 'var(--fg-3)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                gap: 8,
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              ← All courses
            </Link>
            <Eyebrow>{course.tag} · {course.dur}</Eyebrow>
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
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--accent)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 16,
                }}
              >
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
                      <div
                        style={{
                          padding: 24,
                          borderRight: '1px solid var(--line)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                        }}
                      >
                        <div
                          className="mono"
                          style={{
                            fontSize: 32,
                            color: 'var(--accent)',
                            opacity: 0.6,
                            letterSpacing: '-0.03em',
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <div
                            className="mono"
                            style={{
                              fontSize: 10,
                              color: 'var(--fg-3)',
                              letterSpacing: '0.14em',
                              textTransform: 'uppercase',
                            }}
                          >
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
                        <ul
                          style={{
                            listStyle: 'none',
                            padding: 0,
                            margin: 0,
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '6px 16px',
                          }}
                        >
                          {m.topics.map((t) => (
                            <li
                              key={t}
                              style={{
                                display: 'flex',
                                gap: 8,
                                fontSize: 13,
                                color: 'var(--fg-2)',
                              }}
                            >
                              <span style={{ color: 'var(--accent)' }}>—</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div
                        style={{
                          padding: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--bg-1)',
                        }}
                      >
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
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
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
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--accent)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: 18,
                  }}
                >
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
                      <div
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--fg-3)',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          marginTop: 4,
                        }}
                      >
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
