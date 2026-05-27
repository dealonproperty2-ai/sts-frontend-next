'use client';

import * as React from 'react';
import Link from 'next/link';
import Icon from './Icon';
import {
  CornerTicks,
  Eyebrow,
  Placeholder,
  SectionHead,
  SpecLine,
} from './Primitives';
import { Reveal, ScrollFloat, TiltCard, useMouseParallax } from './Parallax';

export const HeroFloatingCards = () => {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const mp = useMouseParallax(stageRef);
  const k = typeof window !== 'undefined' ? window.STS_PARALLAX ?? 0.4 : 0.4;

  const px = (depth: number): React.CSSProperties => ({
    transition: 'transform 280ms cubic-bezier(.22,.7,.36,1)',
    transform: `translate3d(${mp.x * depth * 24 * k}px, ${mp.y * depth * 24 * k}px, 0) rotateX(${
      -mp.y * depth * 4 * k
    }deg) rotateY(${mp.x * depth * 4 * k}deg)`,
  });

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        paddingTop: 120,
        paddingBottom: 80,
      }}
    >
      <div className="blueprint" />
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '70%',
          height: '70%',
          background: 'radial-gradient(closest-side, var(--accent-glow), transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-15%',
          width: '60%',
          height: '60%',
          background:
            'radial-gradient(closest-side, oklch(60% 0.18 var(--accent-h) / 0.25), transparent 70%)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />

      <div className="container hero-grid" style={{ position: 'relative' }} ref={stageRef}>
        <div style={{ position: 'relative', zIndex: 4 }}>
          <Reveal>
            <Eyebrow>S2S — INDIA · WORLDWIDE</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1 style={{ marginTop: 24 }}>
              Software{' '}
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ position: 'relative', zIndex: 1 }}>engineered</span>
                <svg
                  viewBox="0 0 220 14"
                  preserveAspectRatio="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: -6,
                    width: '100%',
                    height: 14,
                    color: 'var(--accent)',
                  }}
                  aria-hidden="true"
                >
                  <path
                    d="M2 8 Q 60 1 120 7 T 218 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <br />
              to outscale
              <br />
              your roadmap.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="lead" style={{ marginTop: 28 }}>
              We&apos;re a 25-strong product engineering studio in Asansol, India. Custom software,
              SaaS, dedicated developer pods — shipped under strict NDA, on flexible engagements.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div style={{ display: 'flex', gap: 14, marginTop: 36, flexWrap: 'wrap' }}>
              <Link href="/contact" className="btn btn-primary">
                Book a discovery call <Icon name="arrow" size={14} />
              </Link>
              <Link href="/services" className="btn btn-ghost">
                <Icon name="play" size={12} /> Tour services
              </Link>
            </div>
          </Reveal>
          <Reveal delay={340}>
            <div style={{ display: 'flex', gap: 36, marginTop: 56, flexWrap: 'wrap' }}>
              {[
                ['7+', 'Years shipping'],
                ['120+', 'Products delivered'],
                ['25', 'In-house engineers'],
              ].map(([n, v]) => (
                <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em' }}>{n}</div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--fg-3)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="hero-stage" style={{ position: 'relative', height: 580, perspective: 1600 }}>
          <div
            style={{
              position: 'absolute',
              inset: '5% -5% 5% 5%',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
              background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2))',
              backgroundImage:
                'linear-gradient(to right, var(--grid) 1px, transparent 1px), linear-gradient(to bottom, var(--grid) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              ...px(0.3),
              transform: `${px(0.3).transform} rotate(-2deg)`,
            }}
          />

          <div
            className="float-card"
            style={{
              top: '4%',
              left: '0%',
              width: '78%',
              height: 220,
              ...px(1.1),
              transform: `${px(1.1).transform} rotate(-3deg)`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderBottom: '1px solid var(--line)',
                background: 'var(--bg-1)',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 999, background: '#ff5f57' }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: '#febc2e' }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: '#28c840' }} />
              <span className="mono" style={{ marginLeft: 12, fontSize: 11, color: 'var(--fg-3)' }}>
                ~/s2s/api/handlers.ts
              </span>
            </div>
            <div className="mono" style={{ padding: 18, fontSize: 12, lineHeight: 1.7 }}>
              <div>
                <span style={{ color: 'var(--fg-4)' }}>01</span>{' '}
                <span style={{ color: 'oklch(70% 0.18 280)' }}>export async</span>{' '}
                <span style={{ color: 'var(--accent)' }}>function</span>{' '}
                <span style={{ color: 'oklch(80% 0.16 200)' }}>deploy</span>() &#123;
              </div>
              <div>
                <span style={{ color: 'var(--fg-4)' }}>02</span>{' '}
                <span style={{ color: 'oklch(70% 0.18 280)' }}>const</span> sprint ={' '}
                <span style={{ color: 'oklch(80% 0.16 200)' }}>await</span> ship.
                <span style={{ color: 'var(--accent)' }}>fast</span>();
              </div>
              <div>
                <span style={{ color: 'var(--fg-4)' }}>03</span>{' '}
                <span style={{ color: 'oklch(70% 0.18 280)' }}>return</span>{' '}
                <span style={{ color: 'oklch(75% 0.16 140)' }}>&apos;shipped&apos;</span>;
              </div>
              <div>
                <span style={{ color: 'var(--fg-4)' }}>04</span> &#125;
              </div>
            </div>
          </div>

          <div
            className="float-card"
            style={{
              top: '32%',
              right: '-4%',
              width: '62%',
              height: 200,
              ...px(1.5),
              transform: `${px(1.5).transform} rotate(4deg)`,
            }}
          >
            <div style={{ padding: 18 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--fg-3)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  UPTIME · 30D
                </div>
                <div className="chip" style={{ padding: '3px 8px', fontSize: 9 }}>
                  <span className="chip-dot" style={{ width: 4, height: 4 }} />
                  LIVE
                </div>
              </div>
              <div style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em' }}>
                99.98<span style={{ color: 'var(--accent)', fontSize: 24 }}>%</span>
              </div>
              <svg
                viewBox="0 0 240 50"
                style={{ width: '100%', height: 50, marginTop: 10 }}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 38 L20 32 L40 34 L60 26 L80 30 L100 22 L120 24 L140 16 L160 20 L180 12 L200 18 L220 8 L240 12 L240 50 L0 50 Z"
                  fill="url(#sg)"
                />
                <path
                  d="M0 38 L20 32 L40 34 L60 26 L80 30 L100 22 L120 24 L140 16 L160 20 L180 12 L200 18 L220 8 L240 12"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          <div
            className="float-card"
            style={{
              bottom: '6%',
              left: '8%',
              width: '56%',
              height: 130,
              ...px(0.8),
              transform: `${px(0.8).transform} rotate(2deg)`,
            }}
          >
            <div style={{ padding: 16 }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--fg-3)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Sprint 47 · 3D LEFT
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                {['team1', 'team2', 'team3', 'team4', 'team5'].map((t, i) => (
                  <div
                    key={t}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      border: '2px solid var(--bg-2)',
                      backgroundImage: `url(/team/${t}.jpg)`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      marginLeft: i === 0 ? 0 : -10,
                      position: 'relative',
                      zIndex: 5 - i,
                    }}
                  />
                ))}
                <span className="mono" style={{ marginLeft: 10, fontSize: 11, color: 'var(--fg-3)' }}>
                  +18 ENG
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: 'var(--bg-3)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '74%',
                    height: '100%',
                    background:
                      'linear-gradient(90deg, var(--accent), oklch(75% 0.18 var(--accent-h)))',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            className="float-card"
            style={{
              top: '-2%',
              right: '6%',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              ...px(1.8),
              transform: `${px(1.8).transform} rotate(8deg)`,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: 'var(--accent)',
                boxShadow: '0 0 12px var(--accent-glow)',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
              BUILD #4821 · OK
            </span>
          </div>

          <div
            className="float-card"
            style={{
              bottom: '14%',
              right: '8%',
              padding: '12px 16px',
              ...px(1.4),
              transform: `${px(1.4).transform} rotate(-5deg)`,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--accent)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              NDA
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>100% in-house</div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 980px) {
          .hero-stage { height: 420px !important; margin-top: 56px; }
        }
        @media (max-width: 600px) {
          .hero-stage { display: none !important; }
        }
      `}</style>
    </section>
  );
};

const SERVICES = [
  {
    icon: 'code',
    tag: '01',
    title: 'Custom Software Development',
    body: 'Bespoke platforms for startups → enterprise. We turn complex requirements into reliable, agile digital systems.',
  },
  {
    icon: 'layers',
    tag: '02',
    title: 'SaaS Product Engineering',
    body: 'End-to-end product builds. Architecture, scaling, billing, observability — we ship the whole stack.',
  },
  {
    icon: 'users',
    tag: '03',
    title: 'Dedicated Developer Pods',
    body: 'On-demand engineers across stacks — extend your team or stand up a new one in two weeks.',
  },
  {
    icon: 'shield',
    tag: '04',
    title: 'Testing & QA',
    body: 'Manual + automated test suites. Performance, security, regression — modern frameworks, full traceability.',
  },
  {
    icon: 'cloud',
    tag: '05',
    title: 'Cloud & Migration',
    body: 'Lift legacy stacks into modern cloud — AWS, GCP, Azure. Reduce ops cost, increase deploy frequency.',
  },
  {
    icon: 'wrench',
    tag: '06',
    title: 'Maintenance & Support',
    body: 'We run your software once it ships. Proactive monitoring, bug triage, perf optimisation, feature drops.',
  },
] as const;

export const ServicesGrid = () => (
  <section className="section">
    <div className="container">
      <SectionHead
        eyebrow="What we do"
        title="Six practices, one studio."
        sub="Hire us as a full team or augment yours. Engagement models flex — fixed-price, monthly retainer, hourly pods."
      />
      <div className="grid-3">
        {SERVICES.map((s, i) => (
          <Reveal key={s.title} delay={i * 60}>
            <TiltCard max={5}>
              <div
                className="card ticked"
                style={{
                  padding: 28,
                  height: '100%',
                  minHeight: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <CornerTicks />
                <div className="between" style={{ marginBottom: 32 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      border: '1px solid var(--accent-edge)',
                      background: 'var(--accent-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                    }}
                  >
                    <Icon name={s.icon} size={22} />
                  </div>
                  <span
                    className="mono"
                    style={{ color: 'var(--fg-4)', fontSize: 12, letterSpacing: '0.1em' }}
                  >
                    /{s.tag}
                  </span>
                </div>
                <h3 style={{ marginBottom: 14 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--fg-3)', flex: 1 }}>{s.body}</p>
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed var(--line)' }}>
                  <Link
                    href="/services"
                    className="link-u mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      color: 'var(--accent)',
                      textTransform: 'uppercase',
                      display: 'inline-flex',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    Read more <Icon name="arrow" size={12} />
                  </Link>
                </div>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

const STACK = [
  ['Angular', 'React', 'Vue', 'Next.js', 'Nuxt', 'Svelte'],
  ['Node.js', 'Python', '.NET', 'Java', 'Go', 'Rust'],
  ['PostgreSQL', 'MongoDB', 'Redis', 'Elastic', 'BigQuery', 'Snowflake'],
  ['AWS', 'GCP', 'Azure', 'Vercel', 'Cloudflare', 'Kubernetes'],
];

export const StackMarquee = () => (
  <section
    style={{
      padding: '60px 0',
      borderTop: '1px solid var(--line)',
      borderBottom: '1px solid var(--line)',
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--bg-1)',
    }}
  >
    <div className="container" style={{ marginBottom: 28 }}>
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: 'var(--fg-3)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        {'// THE STACK WE SHIP ON'}
      </span>
    </div>
    <div style={{ overflow: 'hidden' }}>
      <div className="marquee">
        {[...STACK.flat(), ...STACK.flat()].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }}
            />
            <span
              style={{
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: i % 4 === 0 ? 'var(--fg)' : 'var(--fg-3)',
              }}
            >
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const PROCESS = [
  { tag: '01', title: 'Discover', body: 'A short intro call → scoped proposal in 48h. Fixed quote or T&M.' },
  {
    tag: '02',
    title: 'Architect',
    body: 'Tech lead writes a one-page architecture, then we lock the milestone plan together.',
  },
  {
    tag: '03',
    title: 'Build',
    body: 'Two-week sprints. You see deploys daily. We track velocity, you track outcomes.',
  },
  { tag: '04', title: 'Run', body: 'Once shipped, we keep the system humming — monitoring, support, iteration.' },
];

export const ProcessSection = () => (
  <section className="section">
    <div className="container">
      <SectionHead
        eyebrow="Engagement loop"
        title="How we ship."
        sub="A four-step rhythm we've run on 120+ engagements. Predictable cadence, no surprises."
      />
      <div className="grid-4">
        {PROCESS.map((p, i) => (
          <Reveal key={p.tag} delay={i * 80}>
            <ScrollFloat speed={0.05 + i * 0.03}>
              <div
                style={{
                  position: 'relative',
                  padding: '32px 24px',
                  background: 'var(--bg-1)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-lg)',
                  minHeight: 240,
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 56,
                    color: 'var(--accent)',
                    opacity: 0.18,
                    letterSpacing: '-0.05em',
                    position: 'absolute',
                    top: 14,
                    right: 18,
                  }}
                >
                  /{p.tag}
                </div>
                <h3 style={{ marginBottom: 14, position: 'relative' }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--fg-3)' }}>{p.body}</p>
              </div>
            </ScrollFloat>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

const ENGAGEMENTS = [
  {
    name: 'Dedicated Team',
    tag: 'Most popular',
    desc: 'A self-driving expert pod — PM + engineers + QA — embedded in your stack.',
    bullets: ['Agile sprints', 'Transparent monthly bill', 'Maximum flexibility', 'Scales 3 → 30'],
  },
  {
    name: 'Team Augmentation',
    tag: 'Fast onboarding',
    desc: 'Plug-in engineers who join your existing team and ship from day one.',
    bullets: ['Scale on-demand', 'Cost-effective', 'No hiring hassle', 'Monthly billing'],
  },
  {
    name: 'Project Based',
    tag: 'Fixed scope',
    desc: 'Defined deliverables, fixed quote, milestone payments. Or T&M when scope is fluid.',
    bullets: ['Fixed-price option', 'Time-&-material option', 'Milestone billing', 'Clear acceptance'],
  },
];

export const EngagementSection = () => (
  <section
    className="section"
    style={{
      background: 'var(--bg-1)',
      borderTop: '1px solid var(--line)',
      borderBottom: '1px solid var(--line)',
    }}
  >
    <div className="container">
      <SectionHead
        eyebrow="Engagement models"
        title="Hire us how it suits."
        sub="Three engagement models — pick what matches your scope and burn rate."
      />
      <div className="grid-3">
        {ENGAGEMENTS.map((e, i) => (
          <Reveal key={e.name} delay={i * 100}>
            <div
              className="card"
              style={{
                padding: 32,
                height: '100%',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {i === 0 ? (
                <span style={{ position: 'absolute', top: 14, right: 14 }} className="chip">
                  <span className="chip-dot" /> {e.tag}
                </span>
              ) : (
                <span
                  style={{ position: 'absolute', top: 14, right: 14, color: 'var(--fg-4)' }}
                  className="mono"
                >
                  {e.tag}
                </span>
              )}
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--accent)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Model · 0{i + 1}
              </div>
              <h3 style={{ marginBottom: 12 }}>{e.name}</h3>
              <p style={{ color: 'var(--fg-3)', fontSize: 14, marginBottom: 20 }}>{e.desc}</p>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  flex: 1,
                }}
              >
                {e.bullets.map((b) => (
                  <li
                    key={b}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      fontSize: 14,
                      color: 'var(--fg-2)',
                    }}
                  >
                    <Icon name="check" size={14} stroke={2} /> {b}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="btn btn-ghost"
                style={{ marginTop: 24, justifyContent: 'center' }}
              >
                Talk to us <Icon name="arrow" size={14} />
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export const TrainingTeaser = () => (
  <section className="section">
    <div className="container">
      <div className="training-teaser">
        <div>
          <Eyebrow>Second pillar</Eyebrow>
          <h2 style={{ marginTop: 20 }}>We also train the next wave of devs.</h2>
          <p className="lead" style={{ marginTop: 24 }}>
            Step To Soft runs a hands-on web development bootcamp. 7 months, real projects, taught
            by the same engineers who ship our client work.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 32 }}>
            <Link href="/courses" className="btn btn-primary">
              See curriculum <Icon name="arrow" size={14} />
            </Link>
            <Link href="/careers" className="btn btn-ghost">
              Apply
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
                color: 'var(--fg-3)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 18,
              }}
            >
              Web Dev Bootcamp · 7 months
            </div>
            <SpecLine label="Duration" value="28 weeks" />
            <SpecLine label="Classes" value="120+" />
            <SpecLine label="Stack" value="HTML→React→Node→DB" />
            <SpecLine label="Mode" value="Online + Mentor" />
            <SpecLine label="Cohort" value="Q3 · 24 seats" />
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <Link
                href="/courses/webdev"
                className="btn btn-primary"
                style={{ padding: '10px 16px', fontSize: 13 }}
              >
                Open course <Icon name="arrow" size={12} />
              </Link>
            </div>
          </div>
        </TiltCard>
      </div>
    </div>
  </section>
);

const TESTIMONIALS = [
  {
    quote:
      'S2S spun up a 6-engineer pod in two weeks and shipped our v2 within a quarter. The handoff was clean, the code is ours.',
    who: 'Head of Eng',
    org: 'Healthtech, Bengaluru',
  },
  {
    quote: 'We treated them like a co-founding team — same standup, same Linear board. Zero distance.',
    who: 'CTO',
    org: 'Fintech, Singapore',
  },
  {
    quote: 'Their QA pod caught issues our internal team missed. They run it like a discipline, not a checkbox.',
    who: 'VP Product',
    org: 'eLearning, US',
  },
];

export const TestimonialSection = () => {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="section" style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, var(--accent-soft), transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          opacity: 0.6,
        }}
      />
      <div className="container" style={{ position: 'relative', textAlign: 'center', maxWidth: 880 }}>
        <Eyebrow>Field reports</Eyebrow>
        <div aria-live="polite" aria-atomic="true" style={{ minHeight: 220, marginTop: 32, position: 'relative' }}>
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              aria-hidden={i !== idx}
              style={{
                opacity: i === idx ? 1 : 0,
                transform: i === idx ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 700ms cubic-bezier(.22,.7,.36,1), transform 700ms cubic-bezier(.22,.7,.36,1)',
                position: i === idx ? 'static' : 'absolute',
                top: 0,
                left: 0,
                right: 0,
                pointerEvents: i === idx ? 'auto' : 'none',
              }}
            >
              <p
                style={{
                  fontSize: 'clamp(22px, 3vw, 36px)',
                  fontWeight: 500,
                  letterSpacing: '-0.015em',
                  lineHeight: 1.25,
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>
              <div
                className="mono"
                style={{
                  marginTop: 28,
                  fontSize: 12,
                  letterSpacing: '0.1em',
                  color: 'var(--fg-3)',
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ color: 'var(--fg)' }}>{t.who}</span> · {t.org}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 32 }}>
          {TESTIMONIALS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Show testimonial ${idx + 1}`}
              style={{
                width: i === idx ? 28 : 8,
                height: 8,
                borderRadius: 4,
                background: i === idx ? 'var(--accent)' : 'var(--line-strong)',
                transition: 'all var(--t-med)',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
