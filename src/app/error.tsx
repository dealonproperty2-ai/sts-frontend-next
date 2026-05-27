'use client';

import * as React from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[Page error]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(20px, 4vw, 64px)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 560 }}>
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 20,
          }}
        >
          Error · Something went wrong
        </div>
        <h2 style={{ marginBottom: 16 }}>This page ran into a problem.</h2>
        <p style={{ color: 'var(--fg-2)', marginBottom: 32 }}>
          An unexpected error occurred. Try refreshing the page or head back home.
          {error.digest && (
            <span
              className="mono"
              style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'var(--fg-3)' }}
            >
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
