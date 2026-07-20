/**
 * Company branding for client resource profiles.
 *
 * Nothing about the templates is hardcoded to Step To Soft — swap these values
 * (or the env vars) and the same templates white-label for another agency.
 */
export interface CompanyBranding {
  name: string;
  logoUrl: string;
  website: string;
  tagline: string;
  /** Line printed under the footer attribution on resource profiles. */
  footerNote: string;
}

/** Values come from NEXT_PUBLIC_* so they are available in the browser bundle. */
export const DEFAULT_BRANDING: CompanyBranding = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'STEP TO SOFT PVT. LTD.',
  logoUrl: process.env.NEXT_PUBLIC_COMPANY_LOGO || '/logo3.png',
  website: process.env.NEXT_PUBLIC_COMPANY_WEBSITE || '',
  tagline: process.env.NEXT_PUBLIC_COMPANY_TAGLINE || '',
  footerNote:
    process.env.NEXT_PUBLIC_COMPANY_FOOTER_NOTE ||
    'This document represents an available technical resource.',
};

/**
 * Resolves branding for rendering. Logo paths are made absolute because
 * react-pdf fetches the asset itself and cannot resolve site-relative URLs.
 */
export function resolveBranding(overrides?: Partial<CompanyBranding>): CompanyBranding {
  const merged = { ...DEFAULT_BRANDING, ...(overrides ?? {}) };
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const logoUrl =
    merged.logoUrl && merged.logoUrl.startsWith('/') && origin
      ? `${origin}${merged.logoUrl}`
      : merged.logoUrl;
  return { ...merged, logoUrl };
}
