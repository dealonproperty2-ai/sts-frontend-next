'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import Icon from './Icon';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/courses', label: 'Training' },
  { href: '/careers', label: 'Careers' },
  { href: '/contact', label: 'Contact' },
];

export default function Nav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'all 320ms cubic-bezier(.22,.7,.36,1)',
        background: scrolled ? 'color-mix(in oklab, var(--bg) 72%, transparent)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(140%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(140%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px var(--pad-x)',
        }}
      >
        <Logo />
        <nav
          className="nav-desktop"
          style={{ display: 'flex', gap: 4, alignItems: 'center' }}
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '8px 14px',
                  fontSize: 14,
                  position: 'relative',
                  color: active ? 'var(--fg)' : 'var(--fg-2)',
                  fontWeight: active ? 500 : 400,
                  transition: 'color var(--t-fast)',
                }}
              >
                {item.label}
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      left: 14,
                      right: 14,
                      height: 1,
                      background: 'var(--accent)',
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link
            href="/contact"
            className="btn btn-primary nav-cta"
            style={{ padding: '10px 18px', fontSize: 14 }}
          >
            Start project <Icon name="arrow" size={14} />
          </Link>
          <button
            className="nav-mobile-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            style={{
              width: 40,
              height: 40,
              border: '1px solid var(--line-strong)',
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
      {open && (
        <div
          style={{
            background: 'var(--bg-1)',
            borderTop: '1px solid var(--line)',
            padding: '12px var(--pad-x) 20px',
          }}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '12px 0',
                fontSize: 16,
                borderBottom: '1px solid var(--line)',
              }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="btn btn-primary"
            style={{ marginTop: 16, justifyContent: 'center', width: '100%' }}
          >
            Start project <Icon name="arrow" size={14} />
          </Link>
        </div>
      )}
    </header>
  );
}
