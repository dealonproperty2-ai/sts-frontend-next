'use client';

import * as React from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[Admin error]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--error, #ff7b7b)',
            marginBottom: 16,
          }}
        >
          Admin Error
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
          Something went wrong
        </h2>
        <p style={{ color: 'var(--fg-2)', marginBottom: 8 }}>
          {error.message || 'An unexpected error occurred in the admin panel.'}
        </p>
        {error.digest && (
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: 'var(--fg-3)',
              marginBottom: 24,
            }}
          >
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            background: 'var(--accent)',
            color: '#0a0a0d',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            border: 'none',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
