/**
 * Device-independent A4 PDF export for salary slips.
 *
 * The PDF is NOT a screenshot of the on-screen preview. The caller renders the
 * payslip into a dedicated, off-screen node of fixed width (PDF_RENDER_WIDTH_PX,
 * i.e. the A4 content box at 96 dpi). That node is rasterised by html2canvas
 * with a fixed window width, scale and scroll position, so the output does not
 * depend on the viewport, device pixel ratio, zoom level, responsive media
 * queries or how far the admin has scrolled. The bitmap is then placed on A4
 * pages with real margins and, if taller than one page, split between table
 * rows instead of through them.
 *
 * html2canvas and jsPDF are loaded with dynamic import() so they stay out of the
 * initial admin bundle.
 */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const PDF_MARGIN_MM = 12;
export const PDF_CONTENT_WIDTH_MM = A4_WIDTH_MM - PDF_MARGIN_MM * 2;   // 186
export const PDF_CONTENT_HEIGHT_MM = A4_HEIGHT_MM - PDF_MARGIN_MM * 2; // 273

const CSS_PX_PER_MM = 96 / 25.4;
/** Width of the off-screen render node: the A4 content box in CSS px (≈703). */
export const PDF_RENDER_WIDTH_PX = Math.round(PDF_CONTENT_WIDTH_MM * CSS_PX_PER_MM);
/** Fixed oversampling (≈192 dpi) — deliberately independent of devicePixelRatio. */
const RENDER_SCALE = 2;
/** Window width the capture clone is laid out at, so phone media queries never apply. */
const CAPTURE_WINDOW_WIDTH = 1280;
const ASSET_TIMEOUT_MS = 8000;

/**
 * Splits content of `totalHeight` into page slices no taller than `pageHeight`,
 * ending each slice at the lowest safe break point (e.g. a table-row boundary)
 * that fits. Only when no break point fits is a slice cut at the page height.
 * All values share one unit (CSS px). Returns [start, end) pairs.
 */
export function paginate(totalHeight: number, pageHeight: number, breakPoints: number[]): Array<[number, number]> {
  const EPS = 0.5;
  if (!(totalHeight > EPS) || !(pageHeight > EPS)) return [];
  const breaks = [...new Set(breakPoints)].filter((b) => b > EPS && b < totalHeight).sort((a, b) => a - b);
  const slices: Array<[number, number]> = [];
  let start = 0;
  while (totalHeight - start > EPS) {
    const limit = start + pageHeight;
    if (limit >= totalHeight - EPS) {
      slices.push([start, totalHeight]);
      break;
    }
    // Lowest break that still fits; with none, fall back to a hard cut at the
    // page height rather than overflow the page.
    let end = limit;
    for (const b of breaks) {
      if (b > start + EPS && b <= limit) end = b;
    }
    slices.push([start, end]);
    start = end;
  }
  return slices;
}

/** Safe vertical break points (CSS px from the top of `root`): after each table row and block. */
export function collectBreakPoints(root: HTMLElement): number[] {
  const top = root.getBoundingClientRect().top;
  const points = new Set<number>();
  const blocks = root.querySelectorAll<HTMLElement>('tr, [data-pdf-block]');
  blocks.forEach((el) => points.add(Math.round((el.getBoundingClientRect().bottom - top) * 100) / 100));
  // Direct children of the document root (header, title, tables, words, footer).
  const doc = root.firstElementChild as HTMLElement | null;
  doc?.querySelectorAll<HTMLElement>(':scope > *').forEach((el) => {
    points.add(Math.round((el.getBoundingClientRect().bottom - top) * 100) / 100);
  });
  return [...points];
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))]);
}

/** Resolves once web fonts and every image inside `root` have loaded (or failed / timed out). */
export async function waitForRenderReady(root: HTMLElement): Promise<void> {
  const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  if (fonts?.ready) await withTimeout(fonts.ready, ASSET_TIMEOUT_MS);
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      const loaded = img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          });
      return withTimeout(loaded.then(() => img.decode?.().catch(() => undefined)), ASSET_TIMEOUT_MS);
    })
  );
  // Let React's committed DOM settle into a laid-out frame.
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/** Filesystem-safe file name segment. */
export function safeFileSegment(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'payslip';
}

export interface A4PdfOptions {
  /** id of `root`, used to re-anchor the node inside html2canvas's document clone. */
  sourceId: string;
  fileName: string;
  title?: string;
  author?: string;
}

/**
 * Rasterises `root` (a fixed-width, off-screen node) and downloads it as an A4
 * portrait PDF with PDF_MARGIN_MM margins, paginating at safe break points.
 */
export async function downloadElementAsA4Pdf(root: HTMLElement, opts: A4PdfOptions): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  await waitForRenderReady(root);
  const cssWidth = root.offsetWidth;
  const breakPoints = collectBreakPoints(root);

  // globals.css sets `img { display: block }`. html2canvas measures text
  // baselines in the LIVE document (not its clone) with a hidden probe
  // `<div style="visibility: hidden"><span/><img/></div>` appended to <body>;
  // a block <img> wraps below the text, so every baseline comes out too low and
  // the last line can fall off the bottom of the capture. Keep only that probe
  // image inline, and only while capturing.
  const metricsFix = document.createElement('style');
  metricsFix.textContent = 'body > div[style*="visibility: hidden"] > img { display: inline !important; }';
  document.head.appendChild(metricsFix);
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(root, {
      scale: RENDER_SCALE,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: CAPTURE_WINDOW_WIDTH,
      windowHeight: Math.max(root.scrollHeight, 1000),
      onclone: (doc) => {
        // Bring the off-screen node to the clone's viewport origin.
        const el = doc.getElementById(opts.sourceId);
        if (el) { el.style.left = '0px'; el.style.top = '0px'; }
      },
    });
  } finally {
    metricsFix.remove();
  }
  if (!canvas.width || !canvas.height) throw new Error('Payslip render produced an empty canvas');

  const cssToCanvas = canvas.width / cssWidth;
  const pageHeightCss = PDF_CONTENT_HEIGHT_MM * (cssWidth / PDF_CONTENT_WIDTH_MM);
  const slices = paginate(canvas.height / cssToCanvas, pageHeightCss, breakPoints);
  if (!slices.length) throw new Error('Nothing to export');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  if (opts.title) pdf.setProperties({ title: opts.title, author: opts.author ?? '', creator: opts.author ?? '' });
  const mmPerCanvasPx = PDF_CONTENT_WIDTH_MM / canvas.width;

  slices.forEach(([startCss, endCss], i) => {
    const sy = Math.round(startCss * cssToCanvas);
    const sh = Math.min(canvas.height, Math.round(endCss * cssToCanvas)) - sy;
    if (sh <= 0) return;
    const page = document.createElement('canvas');
    page.width = canvas.width;
    page.height = sh;
    const ctx = page.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, page.width, page.height);
    ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
    if (i > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(page.toDataURL('image/png'), 'PNG', PDF_MARGIN_MM, PDF_MARGIN_MM, PDF_CONTENT_WIDTH_MM, sh * mmPerCanvasPx, undefined, 'FAST');
  });

  pdf.save(opts.fileName);
}
