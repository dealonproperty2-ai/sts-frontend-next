import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Step To Soft — Software Engineering Studio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          background: '#0a0a0d',
          padding: '64px 72px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Dot-grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(245,130,32,0.18) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            display: 'flex',
          }}
        />
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -100,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,130,32,0.22) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* Logo mark */}
        <div
          style={{
            position: 'absolute',
            top: 56,
            left: 72,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#f58220',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'sans-serif',
              fontSize: 22,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            S
          </div>
          <span
            style={{
              fontFamily: 'sans-serif',
              fontSize: 22,
              fontWeight: 600,
              color: '#f0ede8',
              letterSpacing: '-0.3px',
            }}
          >
            Step To Soft
          </span>
        </div>
        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 36,
                height: 3,
                background: '#f58220',
                borderRadius: 2,
                display: 'flex',
              }}
            />
            <span
              style={{
                fontFamily: 'sans-serif',
                fontSize: 14,
                fontWeight: 500,
                color: '#f58220',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}
            >
              Software Engineering Studio
            </span>
          </div>
          <div
            style={{
              fontFamily: 'sans-serif',
              fontSize: 58,
              fontWeight: 700,
              color: '#f0ede8',
              lineHeight: 1.1,
              letterSpacing: '-1.5px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Build. Ship.</span>
            <span style={{ color: '#f58220' }}>Scale.</span>
          </div>
          <div
            style={{
              fontFamily: 'sans-serif',
              fontSize: 20,
              color: '#8a8685',
              marginTop: 8,
              display: 'flex',
            }}
          >
            Custom software · SaaS engineering · Dedicated developer pods
          </div>
        </div>
        {/* Bottom strip */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #f58220 0%, #2d36d9 100%)',
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
