'use client';

import * as React from 'react';
import Link from 'next/link';
import { Eyebrow } from '@/components/Primitives';
import { useMouseParallax } from '@/components/Parallax';

export default function NotFound() {
  const ref = React.useRef<HTMLDivElement>(null);
  const mp = useMouseParallax(ref);
  const k = typeof window !== 'undefined' ? window.STS_PARALLAX ?? 0.4 : 0.4;

  return (
    <div
      className="page-enter"
      ref={ref}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 120,
      }}
    >
      <div className="blueprint" />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${mp.x * 60 * k}px), calc(-50% + ${mp.y * 60 * k}px))`,
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, var(--accent-glow), transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          transition: 'transform 300ms cubic-bezier(.22,.7,.36,1)',
        }}
      />
      <div className="container" style={{ position: 'relative', textAlign: 'center', perspective: 1500 }}>
        <div
          style={{
            transform: `rotateY(${mp.x * 8 * k}deg) rotateX(${-mp.y * 6 * k}deg)`,
            transformStyle: 'preserve-3d',
            transition: 'transform 220ms',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 'clamp(120px, 22vw, 280px)',
              fontWeight: 500,
              letterSpacing: '-0.05em',
              lineHeight: 0.9,
              color: 'var(--accent)',
              textShadow: '0 0 60px var(--accent-glow)',
            }}
          >
            4<span style={{ color: 'var(--fg)' }}>0</span>4
          </div>
          <Eyebrow>Build #404 · Lost in deploy</Eyebrow>
          <h2 style={{ marginTop: 20, maxWidth: 700, marginInline: 'auto' }}>This page didn&apos;t ship.</h2>
          <p className="lead" style={{ marginTop: 20, marginInline: 'auto' }}>
            The route you tried doesn&apos;t exist in our deploy graph. Either we sunset it, or it
            was never built.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 36, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className="btn btn-primary">
              ← Back to home
            </Link>
            <Link href="/contact" className="btn btn-ghost">
              Tell us about it
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
