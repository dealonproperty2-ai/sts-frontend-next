export default function CourseDetailLoading() {
  return (
    <div className="page-enter">
      <section style={{ paddingTop: 160, paddingBottom: 64 }}>
        <div className="container course-hero">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                width: 100,
                height: 12,
                background: 'var(--line-strong)',
                borderRadius: 6,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <div
              style={{
                width: '75%',
                height: 64,
                background: 'var(--line-strong)',
                borderRadius: 8,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <div
              style={{
                width: '90%',
                height: 80,
                background: 'var(--line-strong)',
                borderRadius: 8,
                animation: 'pulse 1.5s ease-in-out 100ms infinite',
              }}
            />
            <div
              style={{
                width: 160,
                height: 48,
                background: 'var(--line-strong)',
                borderRadius: 999,
                animation: 'pulse 1.5s ease-in-out 200ms infinite',
              }}
            />
          </div>
          <div
            className="card"
            style={{
              height: 400,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </section>
    </div>
  );
}
