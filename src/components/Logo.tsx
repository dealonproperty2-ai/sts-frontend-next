import Link from 'next/link';
import Image from 'next/image';

export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <Link
      href="/"
      aria-label="Step To Soft home"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
      }}
    >
      {/* S Logo */}
      <Image
        src="/logo3.png"
        width={size}
        height={size}
        alt="Step To Soft logo"
      />

      {/* Text */}
      <span
        style={{
          fontWeight: 700,
          fontSize: '20px',
          letterSpacing: '-0.03em',
          color: 'var(--foreground)',
          whiteSpace: 'nowrap',
        }}
      >
        STEP <span style={{ color: 'var(--accent)' }}>TO</span> SOFT
      </span>
    </Link>
  );
}