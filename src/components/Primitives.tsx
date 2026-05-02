'use client';

import * as React from 'react';
import Icon, { IconName } from './Icon';

export const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <span className="eyebrow">{children}</span>
);

interface SectionHeadProps {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: string;
  align?: 'left' | 'center';
}

export const SectionHead = ({ eyebrow, title, sub, align = 'left' }: SectionHeadProps) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      alignItems: align === 'center' ? 'center' : 'flex-start',
      textAlign: align,
      marginBottom: 56,
      maxWidth: 720,
      marginLeft: align === 'center' ? 'auto' : 0,
      marginRight: align === 'center' ? 'auto' : 0,
    }}
  >
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 style={{ textWrap: 'balance' as React.CSSProperties['textWrap'] }}>{title}</h2>
    {sub && <p className="lead">{sub}</p>}
  </div>
);

export const SpecLine = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div
    className="mono"
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px dashed var(--line)',
      fontSize: 12,
    }}
  >
    <span style={{ color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      {label}
    </span>
    <span style={{ color: 'var(--fg)' }}>{value}</span>
  </div>
);

export const CornerTicks = () => (
  <>
    <span className="tick-tl" />
    <span className="tick-tr" />
    <span className="tick-bl" />
    <span className="tick-br" />
  </>
);

export const Placeholder = ({
  label = 'image',
  aspect = '16/9',
  style,
}: {
  label?: string;
  aspect?: string;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      aspectRatio: aspect,
      width: '100%',
      background:
        'repeating-linear-gradient(135deg, var(--bg-2) 0 12px, var(--bg-3) 12px 24px)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-md)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--fg-3)',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      ...style,
    }}
  >
    {label}
  </div>
);

export { Icon };
export type { IconName };
