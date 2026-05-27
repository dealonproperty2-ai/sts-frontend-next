export default function RootLoading() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 120,
      }}
      aria-label="Loading page content"
      role="status"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '2px solid var(--line-strong)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 700ms linear infinite',
          }}
        />
        <span
          className="mono"
          style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--fg-3)', textTransform: 'uppercase' }}
        >
          Loading…
        </span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
