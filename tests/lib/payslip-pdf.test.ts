import { describe, expect, it } from 'vitest';
import {
  A4_HEIGHT_MM, A4_WIDTH_MM, PDF_CONTENT_HEIGHT_MM, PDF_CONTENT_WIDTH_MM, PDF_MARGIN_MM, PDF_RENDER_WIDTH_PX,
  paginate, safeFileSegment,
} from '@/lib/payslipPdf';

describe('A4 geometry', () => {
  it('uses A4 portrait with symmetric margins', () => {
    expect([A4_WIDTH_MM, A4_HEIGHT_MM]).toEqual([210, 297]);
    expect(PDF_CONTENT_WIDTH_MM).toBe(210 - 2 * PDF_MARGIN_MM);
    expect(PDF_CONTENT_HEIGHT_MM).toBe(297 - 2 * PDF_MARGIN_MM);
  });

  it('renders at the A4 content width in CSS px (96 dpi), independent of the viewport', () => {
    expect(PDF_RENDER_WIDTH_PX).toBe(Math.round(PDF_CONTENT_WIDTH_MM * 96 / 25.4)); // 703
  });
});

describe('paginate', () => {
  it('keeps content that fits on one page as a single slice', () => {
    expect(paginate(700, 1000, [100, 300, 650])).toEqual([[0, 700]]);
  });

  it('treats content exactly one page tall as a single page (no blank trailing page)', () => {
    expect(paginate(1000, 1000, [500])).toEqual([[0, 1000]]);
    expect(paginate(1000.3, 1000, [500])).toEqual([[0, 1000.3]]);
  });

  it('breaks at the lowest row boundary that fits instead of cutting through a row', () => {
    // Rows end at 400, 950, 1100 — page holds 1000, so page 1 must end at 950.
    expect(paginate(1500, 1000, [400, 950, 1100])).toEqual([[0, 950], [950, 1500]]);
  });

  it('covers the whole height contiguously with no gaps or overlaps', () => {
    const breaks = Array.from({ length: 60 }, (_, i) => (i + 1) * 37);
    const slices = paginate(2250, 800, breaks);
    expect(slices[0][0]).toBe(0);
    expect(slices[slices.length - 1][1]).toBe(2250);
    for (let i = 1; i < slices.length; i++) expect(slices[i][0]).toBe(slices[i - 1][1]);
    for (const [a, b] of slices) {
      expect(b - a).toBeGreaterThan(0);
      expect(b - a).toBeLessThanOrEqual(800);
    }
  });

  it('falls back to a hard cut only when a single block is taller than a page', () => {
    expect(paginate(2500, 1000, [2400])).toEqual([[0, 1000], [1000, 2000], [2000, 2500]]);
  });

  it('ignores break points outside the content and duplicates', () => {
    expect(paginate(1500, 1000, [-5, 0, 950, 950, 1500, 9999])).toEqual([[0, 950], [950, 1500]]);
  });

  it('returns no slices for empty content', () => {
    expect(paginate(0, 1000, [])).toEqual([]);
    expect(paginate(500, 0, [])).toEqual([]);
  });
});

describe('safeFileSegment', () => {
  it('keeps normal employee codes and months unchanged', () => {
    expect(safeFileSegment('STS0000001')).toBe('STS0000001');
    expect(safeFileSegment('2026-10')).toBe('2026-10');
  });

  it('strips path separators and unsafe characters', () => {
    expect(safeFileSegment('WB/ASN 12\\34:?*')).toBe('WB-ASN-12-34');
    expect(safeFileSegment('../../etc')).toBe('..-..-etc');
    expect(safeFileSegment('///')).toBe('payslip');
  });
});
