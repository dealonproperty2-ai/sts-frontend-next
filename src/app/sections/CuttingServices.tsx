import Link from 'next/link';
import Icon, { IconName } from '@/components/Icon';
import { CornerTicks, Eyebrow } from '@/components/Primitives';
import { Reveal } from '@/components/Parallax';

// ✅ icon is a string (IconName), NOT a React component.
// Never put `Icon: SomeComponent` in a data array — React components
// can't be passed as props from Server → Client Components.
interface ServiceDef {
  icon: IconName;
  number: string;
  tag: string;
  title: string;
  desc: string;
  bullets: string[];
}

const CUTTING_SERVICES: ServiceDef[] = [
  {
    icon: 'code',
    number: '01',
    tag: 'Cutting Services',
    title: 'Custom Software Development',
    desc: 'Bespoke platforms for startups → enterprise. We turn complex requirements into reliable, agile digital systems.',
    bullets: ['Discovery & spec', 'Architecture doc', 'CI/CD pipeline', 'Production deploys'],
  },
  {
    icon: 'layers',
    number: '02',
    tag: 'Cutting Services',
    title: 'SaaS Product Engineering',
    desc: 'End-to-end product builds. Architecture, scaling, billing, observability — we ship the whole stack.',
    bullets: ['MVP in 8 weeks', 'Multi-tenant architecture', 'Stripe billing', 'Auth + RBAC'],
  },
  {
    icon: 'users',
    number: '03',
    tag: 'Cutting Services',
    title: 'Dedicated Developer Pods',
    desc: 'A self-driving pod that operates as your team. We hire, manage, and replace — you get the velocity.',
    bullets: ['Onboard in 2 weeks', 'Daily standup with you', 'Code in your repos', 'Monthly retro'],
  },
];

function ServiceCard({ s }: { s: ServiceDef }) {
  return (
    <div
      className="card ticked"
      style={{
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CornerTicks />

      {/* Icon + number header */}
      <div
        style={{
          padding: '28px 28px 20px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
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
            flexShrink: 0,
          }}
        >
          {/* ✅ Render icon by name string — works in both Server and Client components */}
          <Icon name={s.icon} size={22} />
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            SERVICE / {s.number}
          </div>
          <h3 style={{ margin: '4px 0 0', fontSize: 18 }}>{s.title}</h3>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 28px', flex: 1 }}>
        <p style={{ color: 'var(--fg-3)', fontSize: 14, marginBottom: 20 }}>{s.desc}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {s.bullets.map(b => (
            <li key={b} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: 'var(--fg-2)' }}>
              <Icon name="check" size={14} stroke={2} />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '16px 28px', borderTop: '1px dashed var(--line)' }}>
        <Link
          href="/contact"
          className="link-u mono"
          style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', display: 'inline-flex', gap: 8, alignItems: 'center' }}
        >
          Brief us <Icon name="arrow" size={12} />
        </Link>
      </div>
    </div>
  );
}

export default function CuttingServicesSection() {
  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <Eyebrow>Cutting Services</Eyebrow>
          <h2 style={{ marginTop: 20, maxWidth: 700 }}>Engineering that cuts through complexity.</h2>
          <p className="lead" style={{ marginTop: 20, maxWidth: 600 }}>
            Three core practices that cover 90% of what modern product teams need to ship faster.
          </p>
        </Reveal>

        <div className="grid-3" style={{ marginTop: 48 }}>
          {CUTTING_SERVICES.map((s, i) => (
            <Reveal key={s.number} delay={i * 80}>
              <ServiceCard s={s} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
