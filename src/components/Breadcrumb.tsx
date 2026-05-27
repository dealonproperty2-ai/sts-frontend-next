import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Renders a visible breadcrumb trail using semantic HTML + inline microdata.
// Pair this with a buildBreadcrumbSchema() JSON-LD block in the same page.
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 12 }}>
      <ol
        itemScope
        itemType="https://schema.org/BreadcrumbList"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0 6px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          fontSize: 12,
          fontFamily: 'var(--font-mono, monospace)',
          letterSpacing: '0.08em',
        }}
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li
              key={item.label}
              itemScope
              itemProp="itemListElement"
              itemType="https://schema.org/ListItem"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  itemProp="item"
                  style={{
                    color: 'var(--fg-3)',
                    textDecoration: 'none',
                    transition: 'color var(--t-fast)',
                  }}
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span
                  itemProp="name"
                  aria-current={isLast ? 'page' : undefined}
                  style={{ color: isLast ? 'var(--accent)' : 'var(--fg-3)' }}
                >
                  {item.label}
                </span>
              )}
              <meta itemProp="position" content={String(i + 1)} />
              {!isLast && (
                <span aria-hidden="true" style={{ color: 'var(--fg-4)' }}>
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
