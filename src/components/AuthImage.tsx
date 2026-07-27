'use client';

import { useEffect, useState } from 'react';

/**
 * Renders an image served from an auth-gated admin endpoint.
 *
 * The uploaded-file route (`/api/admin/resources/file/...`) requires a Bearer
 * token, but a plain <img src> can't send Authorization headers (the admin JWT
 * lives in localStorage, not a cookie) — so those requests 401. This component
 * fetches the image WITH the token, renders it via an object URL, and shows the
 * provided fallback (e.g. an initials avatar) while loading or on any error.
 */
function authHeaders(): Record<string, string> {
  const t = typeof window !== 'undefined' ? localStorage.getItem('sts-admin-token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function AuthImage({ src, alt = '', style, fallback }: {
  src?: string;
  alt?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setUrl('');
    setFailed(false);
    if (!src) return;
    (async () => {
      try {
        const res = await fetch(src, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);

  if (!src || failed || !url) return <>{fallback ?? null}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} style={style} />;
}
