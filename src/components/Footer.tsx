import Link from 'next/link';
import Logo from './Logo';
import Icon, { IconName } from './Icon';

const COLS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Company',
    links: [
      ['About', '/about'],
      ['Services', '/services'],
      ['Careers', '/careers'],
      ['Contact', '/contact'],
    ],
  },
  {
    title: 'Services',
    links: [
      ['Custom Software', '/services'],
      ['SaaS Products', '/services'],
      ['Dedicated Teams', '/services'],
      ['Cloud & Migration', '/services'],
    ],
  },
  {
    title: 'Training',
    links: [
      ['All Courses', '/courses'],
      ['Web Dev Bootcamp', '/courses/webdev'],
      ['Apply', '/careers'],
    ],
  },
];

const SOCIAL: { icon: IconName; label: string; href: string }[] = [
  { icon: 'github',   label: 'Step To Soft on GitHub',   href: 'https://github.com/steptosoft' },
  { icon: 'linkedin', label: 'Step To Soft on LinkedIn', href: 'https://www.linkedin.com/company/steptosoft' },
  { icon: 'mail',     label: 'Email Step To Soft',       href: 'mailto:info@steptosoft.com' },
];

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--line)',
        background: 'var(--bg-1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="blueprint-fine" style={{ opacity: 0.3 }} />
      <div className="container" style={{ padding: '80px var(--pad-x) 32px', position: 'relative' }}>
        <div className="footer-grid">
          <div>
            <Logo />
            <p style={{ marginTop: 24, maxWidth: 320, color: 'var(--fg-3)', fontSize: 14 }}>
              Custom software, SaaS engineering, and dedicated dev teams. Built in Asansol, shipping
              worldwide since 2018.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              {SOCIAL.map((s) => (
                <a
                  key={s.icon}
                  href={s.href}
                  aria-label={s.label}
                  target={s.href.startsWith('http') ? '_blank' : undefined}
                  rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  style={{
                    width: 36,
                    height: 36,
                    border: '1px solid var(--line-strong)',
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--fg-2)',
                    transition: 'all var(--t-fast)',
                  }}
                >
                  <Icon name={s.icon} size={15} />
                </a>
              ))}
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-3)',
                  marginBottom: 18,
                }}
              >
                {col.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {col.links.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="link-u"
                    style={{
                      fontSize: 14,
                      color: 'var(--fg-2)',
                      display: 'inline-block',
                      width: 'fit-content',
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--line)',
            paddingTop: 24,
            gap: 24,
            flexWrap: 'wrap',
            marginTop: 64,
          }}
        >
          <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>
            © 2018–{new Date().getFullYear()} STEP TO SOFT PVT. LTD. — ASANSOL, WB, IN
          </div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--fg-3)',
              letterSpacing: '0.1em',
              display: 'flex',
              gap: 18,
            }}
          >
            <Link href="/privacy" className="link-u">
              PRIVACY
            </Link>
            <Link href="/terms" className="link-u">
              TERMS
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
