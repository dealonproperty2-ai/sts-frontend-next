'use client';

/**
 * Re-encodes an uploaded PNG/JPEG data URL through a canvas (browser only).
 *
 * Browsers draw slightly malformed images leniently, but the PDF engine's PNG
 * decoder throws on them (e.g. "Invalid filter algorithm") — and the error
 * escapes the render promise, so the download just times out. A canvas
 * round-trip always yields a standard 8-bit, non-interlaced image. Large
 * images are scaled down (longest side ≤ maxSide), which also keeps letters small.
 */
export function normalizeImageDataUrl(dataUrl: string, maxSide = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const mime = dataUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight, 1));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not process the image.')); return; }
      if (mime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); } // JPEG has no transparency
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL(mime, 0.92));
    };
    img.onerror = () => reject(new Error('This file could not be read as an image.'));
    img.src = dataUrl;
  });
}

/** Normalises an optional image source; returns null when absent. */
export async function normalizeOptionalImage(src: string | null): Promise<string | null> {
  return src ? normalizeImageDataUrl(src) : null;
}
