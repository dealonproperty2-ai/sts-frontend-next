export default function CoursesLoading() {
  return (
    <div className="page-enter">
      <section style={{ paddingTop: 160, paddingBottom: 80 }}>
        <div className="container">
          <div
            style={{
              width: 120,
              height: 12,
              background: 'var(--line-strong)',
              borderRadius: 6,
              marginBottom: 24,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: '60%',
              height: 56,
              background: 'var(--line-strong)',
              borderRadius: 8,
              marginBottom: 16,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: '40%',
              height: 24,
              background: 'var(--line-strong)',
              borderRadius: 6,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="grid-3" style={{ gap: 28 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="card"
                style={{
                  height: 320,
                  animation: `pulse 1.5s ease-in-out ${i * 100}ms infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
