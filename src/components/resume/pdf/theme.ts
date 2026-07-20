import { StyleSheet } from '@react-pdf/renderer';

/**
 * Design tokens for the premium (react-pdf) resume templates.
 * Deliberately restrained: white ground, navy headings, hairline rules, one blue
 * accent. No decorative colour — the layout has to read as a corporate document.
 */
export const color = {
  primary: '#1E3A8A',   // navy — headings
  accent:  '#2563EB',   // blue — links, rules, small marks
  text:    '#111827',   // body
  muted:   '#6B7280',   // secondary/meta
  border:  '#E5E7EB',   // hairlines
  surface: '#F9FAFB',   // sidebar / chip fill
  white:   '#FFFFFF',
} as const;

/** Point-based type scale (1pt ≈ 1.333px at 96dpi; A4 is 595×842pt). */
export const type = {
  name:      26,   // ~36px
  role:      13,   // ~18px
  section:   9.5,  // ~13px, uppercase + tracked
  body:      8.6,  // ~11.5px
  small:     7.8,
  tiny:      7,
} as const;

export const space = {
  page:      34,
  section:   13,
  block:     7,
  row:       3,
  gutter:    18,
} as const;

/** Line height 1.6 per the spec, applied through shared text styles. */
export const LINE = 1.6;

export const base = StyleSheet.create({
  page: {
    backgroundColor: color.white,
    color: color.text,
    fontFamily: 'Helvetica',
    fontSize: type.body,
    lineHeight: LINE,
  },
  // Section heading: small, uppercase, tracked — the classic corporate device.
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: type.section,
    color: color.primary,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  rule: {
    borderBottomWidth: 0.75,
    borderBottomColor: color.border,
    marginBottom: space.block,
  },
  body: {
    fontSize: type.body,
    color: color.text,
    lineHeight: LINE,
  },
  muted: {
    fontSize: type.small,
    color: color.muted,
    lineHeight: LINE,
  },
  bold: { fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
});
