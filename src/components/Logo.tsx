import Link from 'next/link';

export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }} aria-label="Step To Soft home">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="29" height="29" rx="7" stroke="var(--accent)" strokeWidth="1.2" />
        <path
          d="M9 11 L16 7 L23 11 L23 21 L16 25 L9 21 Z"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.2"
        />
        <path
          d="M16 7 L16 16 L9 11 M16 16 L23 11 M16 16 L16 25"
          stroke="var(--accent)"
          strokeWidth="1"
          opacity="0.6"
        />
        <circle cx="16" cy="16" r="2" fill="var(--accent)" />
      </svg>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 18 }}>
          step<span style={{ color: 'var(--accent)' }}>·</span>to
          <span style={{ color: 'var(--accent)' }}>·</span>soft
        </span>
        <span
          className="mono"
          style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.2em', marginTop: 4 }}
        >
          S2S — EST. 2018
        </span>
      </span>
    </Link>
  );
}
