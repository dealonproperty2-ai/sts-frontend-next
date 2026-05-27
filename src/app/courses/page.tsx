import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { CornerTicks, Eyebrow, SectionHead, SpecLine } from '@/components/Primitives';
import { Reveal, TiltCard } from '@/components/Parallax';
import { Breadcrumb } from '@/components/Breadcrumb';
import CTABanner from '@/components/CTABanner';
import { connectDb } from '@/server/db';
import Course from '@/server/models/Course';
import {
  SITE,
  BASE_KEYWORDS,
  COURSE_KEYWORDS,
  buildFAQSchema,
  buildBreadcrumbSchema,
} from '@/lib/seo';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Web Development Courses & Coding Bootcamp — MERN Stack, React.js, Node.js Training',
  description:
    'Step To Soft Academy offers live-cohort web development bootcamp and coding courses: MERN stack, React.js, Node.js, frontend, backend, Angular, DevOps & QA. Real projects, 1-on-1 mentors, job-placement support in India.',
  keywords: [
    ...BASE_KEYWORDS,
    ...COURSE_KEYWORDS,
    'coding bootcamp India',
    'web development training India',
    'online coding courses India',
    'software development course India',
    'MERN stack bootcamp',
    'React.js bootcamp India',
    'Node.js course India',
    'full stack web development course',
    'job-oriented coding course India',
    'developer bootcamp with placement',
    'learn web development online',
    'Step To Soft Academy',
  ],
  alternates: { canonical: '/courses' },
  openGraph: {
    url: '/courses',
    type: 'website',
    title: 'Web Development Courses & Coding Bootcamp — MERN Stack, React.js, Node.js | Step To Soft',
    description:
      'Six live-cohort tracks: MERN stack, React.js, Node.js, frontend, backend, Angular, DevOps & QA. Real projects, 1-on-1 mentors, job-placement support.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Web Development Courses & Coding Bootcamp — MERN Stack, React.js, Node.js | Step To Soft',
    description:
      'Six live-cohort tracks: MERN stack, React.js, Node.js, frontend, backend, Angular, DevOps & QA. Real projects, 1-on-1 mentors, job-placement support.',
  },
};

export default async function CoursesPage() {
  await connectDb();
  const courses = await Course.find({ isActive: true })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();

  const coursesJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Step To Soft Academy — Web Development & Coding Courses',
    description: 'Live-cohort web development and coding courses including MERN stack, React.js, Node.js, frontend, backend, DevOps, and QA training.',
    itemListElement: courses.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Course',
        '@id': `${SITE.url}/courses/${c.slug}`,
        name: c.title,
        description: c.desc,
        url: `${SITE.url}/courses/${c.slug}`,
        provider: {
          '@type': 'Organization',
          '@id': `${SITE.url}/#organization`,
          name: 'Step To Soft Academy',
          sameAs: SITE.url,
        },
        courseMode: ['online', 'onsite'],
        inLanguage: 'en',
        educationalLevel: 'Beginner to Advanced',
        teaches: c.stack,
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'Online',
          inLanguage: 'en',
          courseSchedule: {
            '@type': 'Schedule',
            repeatFrequency: 'P1W',
            repeatCount: c.weeks,
          },
        },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: c.priceInr,
          availability: 'https://schema.org/InStock',
          category: 'Tuition',
          url: `${SITE.url}/courses/${c.slug}`,
        },
      },
    })),
  };

  const coursesFaqJsonLd = buildFAQSchema([
    {
      q: 'What web development courses does Step To Soft Academy offer?',
      a: 'Step To Soft Academy offers six live-cohort tracks: Full-Stack Web Development Bootcamp (MERN stack), Frontend Development (React.js), Backend Development (Node.js), Angular Development, DevOps Engineering, and QA Automation. All courses feature live classes, 1-on-1 mentorship, real projects, and job-placement support.',
    },
    {
      q: 'Is the MERN stack bootcamp available online?',
      a: 'Yes. All courses at Step To Soft Academy are available online with live video classes, recorded replays, and weekly 1-on-1 mentor sessions. Students from anywhere in India and abroad can enroll.',
    },
    {
      q: 'What is the duration and fee for the full-stack web development bootcamp?',
      a: 'The Full-Stack Web Development Bootcamp is 28 weeks (7 months) with 120+ live classes covering HTML, CSS, JavaScript, React.js, Node.js, and databases. Contact us or visit the course page for current pricing and EMI options.',
    },
    {
      q: 'Does Step To Soft Academy provide job placement assistance?',
      a: 'Yes. All cohorts include mock interviews, resume review, GitHub profile optimisation, and introductions to our hiring partner network. Our last three cohorts achieved a 78% placement rate within 90 days of graduation.',
    },
    {
      q: 'Do I need prior coding experience to join the bootcamp?',
      a: 'No prior coding experience is required for the Full-Stack Web Development Bootcamp. The curriculum starts from absolute basics — HTML & CSS — and progressively builds to full MERN stack development. Other tracks like DevOps and QA Automation may require some programming familiarity.',
    },
    {
      q: 'Who teaches the courses at Step To Soft Academy?',
      a: 'All courses are taught by working engineers from Step To Soft who are actively shipping client software. Mentors are senior engineers with 5+ years of industry experience in React.js, Node.js, DevOps, or QA.',
    },
  ]);

  const breadcrumbJsonLd = buildBreadcrumbSchema([
    { name: 'Home', url: SITE.url },
    { name: 'Courses', url: `${SITE.url}/courses` },
  ]);

  return (
    <div className="page-enter">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(coursesJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(coursesFaqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section style={{ paddingTop: 160, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
        <div className="blueprint" />
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '-10%',
            width: '40%',
            height: '60%',
            background: 'radial-gradient(closest-side, var(--accent-glow), transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.4,
          }}
        />
        <div className="container" style={{ position: 'relative' }}>
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Courses' }]} />
          <Eyebrow>Training · Step To Soft Academy</Eyebrow>
          <h1 style={{ marginTop: 24, maxWidth: 1000 }}>
            Web Development Bootcamp & Coding Courses — MERN Stack, React.js, Node.js.
          </h1>
          <p className="lead" style={{ marginTop: 28 }}>
            Six live-cohort tracks taught by the engineers who ship our client software. MERN stack,
            React.js, Node.js, Angular, DevOps & QA — real projects, real mentors, job-placement support.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 36, flexWrap: 'wrap' }}>
            <Link href="/careers" className="btn btn-primary">
              Apply now <Icon name="arrow" size={14} />
            </Link>
            <Link href="/contact" className="btn btn-ghost">
              <Icon name="book" size={14} /> Talk to admissions
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 36,
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {`// ${courses.length} active tracks · cohort starts Q3`}
            </span>
          </div>
          <div className="grid-3">
            {courses.map((c, i) => (
              <Reveal key={String(c._id)} delay={i * 60}>
                <TiltCard max={5}>
                  <Link href={`/courses/${c.slug}`} style={{ display: 'block' }}>
                    <div
                      className="card ticked"
                      style={{ padding: 28, height: '100%', minHeight: 380, display: 'flex', flexDirection: 'column', position: 'relative' }}
                    >
                      <CornerTicks />
                      <div className="between" style={{ marginBottom: 24 }}>
                        <div
                          style={{
                            width: 44, height: 44, borderRadius: 12,
                            border: '1px solid var(--accent-edge)',
                            background: 'var(--accent-soft)',
                            color: 'var(--accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Icon name={c.icon as IconName} size={20} />
                        </div>
                        <span className="chip">
                          <span className="chip-dot" />
                          {c.tag}
                        </span>
                      </div>
                      <h2 style={{ marginBottom: 10, fontSize: 22 }}>{c.title}</h2>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em', marginBottom: 14 }}>
                        {c.dur}
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--fg-3)', flex: 1 }}>{c.desc}</p>
                      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed var(--line)' }}>
                        <SpecLine label="Stack" value={c.stack} />
                        <SpecLine label="Seats" value={`${c.seats} per cohort`} />
                        <SpecLine label="Fee" value={c.price} />
                      </div>
                      <div style={{ marginTop: 20 }}>
                        <span className="btn btn-primary" style={{ padding: '10px 14px', fontSize: 13, width: '100%', justifyContent: 'center' }}>
                          Open course <Icon name="arrow" size={12} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-1)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <SectionHead eyebrow="How cohorts run" title="Live, mentored, project-based." />
          <div className="grid-4">
            {[
              { tag: '01', title: 'Live classes', body: '3 sessions/week with the lead instructor. Recorded for replay.' },
              { tag: '02', title: '1-on-1 mentor', body: 'Weekly hour with a senior engineer from our client work.' },
              { tag: '03', title: 'Real projects', body: 'Three portfolio-grade projects per cohort, deployed to live URLs.' },
              { tag: '04', title: 'Placement', body: 'Mock interviews, resume review, intro to our hiring partners.' },
            ].map((p, i) => (
              <Reveal key={p.tag} delay={i * 80}>
                <div
                  style={{
                    position: 'relative',
                    padding: '28px 22px',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-lg)',
                    minHeight: 200,
                  }}
                >
                  <div className="mono" style={{ fontSize: 56, color: 'var(--accent)', opacity: 0.18, position: 'absolute', top: 14, right: 18 }}>
                    /{p.tag}
                  </div>
                  <h3 style={{ marginBottom: 10, fontSize: 20 }}>{p.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </div>
  );
}
