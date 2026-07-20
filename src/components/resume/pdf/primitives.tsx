import * as React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { base, color, space, type } from './theme';

/**
 * Shared building blocks for every premium template.
 *
 * The auto-hide contract lives here: `ResumeSection` renders nothing when it has
 * no children, and the `hasContent` helper lets callers bail before creating a
 * heading. Together they guarantee no empty headings and no blank gaps.
 */

/** react-pdf's style union, derived from the component props so it always matches. */
export type PdfStyle = React.ComponentProps<typeof View>['style'];

export function hasContent(...values: Array<unknown>): boolean {
  return values.some((v) => {
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'number') return v > 0;
    return Boolean(v);
  });
}

const s = StyleSheet.create({
  section: { marginBottom: space.section },
  bulletRow: { flexDirection: 'row', marginBottom: space.row, paddingRight: 2 },
  bulletMark: { width: 8, fontSize: type.body, color: color.accent, lineHeight: 1.6 },
  bulletText: { flex: 1, fontSize: type.body, color: color.text, lineHeight: 1.6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: {
    fontSize: type.tiny,
    color: color.text,
    backgroundColor: color.surface,
    borderWidth: 0.5,
    borderColor: color.border,
    borderRadius: 2,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
  },
  divider: { borderBottomWidth: 0.75, borderBottomColor: color.border },
});

/** A titled block that disappears entirely when it has no content. */
export function ResumeSection({
  title,
  children,
  show = true,
  rule = true,
  titleStyle,
}: {
  title?: string;
  children?: React.ReactNode;
  /** Caller-computed emptiness check. */
  show?: boolean;
  rule?: boolean;
  titleStyle?: PdfStyle;
}) {
  const kids = React.Children.toArray(children).filter(Boolean);
  if (!show || kids.length === 0) return null;
  return (
    <View style={s.section} wrap>
      {title ? <Text style={titleStyle ? [base.sectionTitle, titleStyle].flat() : base.sectionTitle}>{title}</Text> : null}
      {title && rule ? <View style={base.rule} /> : null}
      {kids}
    </View>
  );
}

export function ResumeDivider({ style }: { style?: PdfStyle }) {
  return <View style={style ? [s.divider, style].flat() : s.divider} />;
}

/** Bulleted line. Renders nothing for blank text so lists self-trim. */
export function Bullet({ children, color: mark }: { children?: string; color?: string }) {
  if (!children || !children.trim()) return null;
  return (
    <View style={s.bulletRow} wrap={false}>
      <Text style={[s.bulletMark, mark ? { color: mark } : {}]}>•</Text>
      <Text style={s.bulletText}>{children.trim()}</Text>
    </View>
  );
}

export function BulletList({ items, max }: { items?: string[]; max?: number }) {
  const list = (items ?? []).filter((i) => i && i.trim());
  if (!list.length) return null;
  const shown = max ? list.slice(0, max) : list;
  return <>{shown.map((t, i) => <Bullet key={i}>{t}</Bullet>)}</>;
}

/** Compact technology chips. */
export function Chips({ items }: { items?: string[] }) {
  const list = (items ?? []).filter((i) => i && i.trim());
  if (!list.length) return null;
  return (
    <View style={s.chipWrap}>
      {list.map((t, i) => <Text key={i} style={s.chip}>{t}</Text>)}
    </View>
  );
}

/** "Label: value" meta line used in sidebars. */
export function MetaRow({ label, value }: { label: string; value?: string | number }) {
  const v = value == null ? '' : String(value).trim();
  if (!v) return null;
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={{ fontSize: type.tiny, color: color.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ fontSize: type.small, color: color.text, lineHeight: 1.5 }}>{v}</Text>
    </View>
  );
}
