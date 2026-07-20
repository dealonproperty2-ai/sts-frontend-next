'use client';

import { useEffect, useState } from 'react';

// Fetches an admin-protected file (the file routes require a Bearer token, so the
// URL can't be used directly in <iframe>/<img>) and returns a blob URL that is
// revoked on unmount / url change.
export function useSecureBlob(fileUrl: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fileUrl) { setBlobUrl(null); return; }

    let cancelled = false;
    let objectUrl: string | null = null;

    setLoading(true);
    setBlobUrl(null);

    const token =
      typeof window !== 'undefined'
        ? (localStorage.getItem('sts-admin-token') ?? '')
        : '';

    fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('not ok');
        return r.blob();
      })
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setBlobUrl(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl]);

  return { blobUrl, loading };
}

// One-click download of an admin-protected file, preserving the original name.
export async function downloadSecureFile(fileUrl: string, fileName: string) {
  const token =
    typeof window !== 'undefined' ? (localStorage.getItem('sts-admin-token') ?? '') : '';
  const res = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'resume';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
