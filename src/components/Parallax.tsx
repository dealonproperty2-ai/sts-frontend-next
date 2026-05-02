'use client';

import * as React from 'react';

declare global {
  interface Window {
    STS_PARALLAX?: number;
  }
}

if (typeof window !== 'undefined' && typeof window.STS_PARALLAX === 'undefined') {
  window.STS_PARALLAX = 0.4;
}

export const useMouseParallax = (ref: React.RefObject<HTMLElement>) => {
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const x = (e.clientX - cx) / (r.width / 2);
      const y = (e.clientY - cy) / (r.height / 2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setPos({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) })
      );
    };
    const onLeave = () => setPos({ x: 0, y: 0 });
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [ref]);
  return pos;
};

export const Reveal = ({
  children,
  delay = 0,
  y = 24,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  style?: React.CSSProperties;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity 800ms cubic-bezier(.22,.7,.36,1) ${delay}ms, transform 800ms cubic-bezier(.22,.7,.36,1) ${delay}ms`,
        willChange: 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const TiltCard = ({
  children,
  max = 8,
  style,
  className,
}: {
  children: React.ReactNode;
  max?: number;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [t, setT] = React.useState({ rx: 0, ry: 0 });
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const k = window.STS_PARALLAX ?? 0.4;
    setT({ ry: (x - 0.5) * 2 * max * k, rx: -(y - 0.5) * 2 * max * k });
  };
  const onLeave = () => setT({ rx: 0, ry: 0 });
  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transform: `perspective(1200px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)`,
        transformStyle: 'preserve-3d',
        transition: 'transform 320ms cubic-bezier(.22,.7,.36,1)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const ScrollFloat = ({
  children,
  speed = 0.15,
  style,
}: {
  children: React.ReactNode;
  speed?: number;
  style?: React.CSSProperties;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (!el) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const vh = window.innerHeight;
      const offset = (center - vh / 2) / vh;
      const k = window.STS_PARALLAX ?? 0.4;
      setT(offset * speed * 100 * k);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speed]);
  return (
    <div
      ref={ref}
      style={{ transform: `translate3d(0, ${t}px, 0)`, willChange: 'transform', ...style }}
    >
      {children}
    </div>
  );
};
