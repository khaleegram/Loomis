/**
 * Public school website URL helpers.
 * Production domain: loomis.digital (www.loomis.digital for path-based sites).
 */

const DEFAULT_PUBLIC_SITE_BASE = 'https://www.loomis.digital';

/** Base URL for path-based school sites, e.g. https://www.loomis.digital */
export function resolvePublicSiteBaseUrl(envBase?: string | null): string {
  const base = (envBase ?? DEFAULT_PUBLIC_SITE_BASE).replace(/\/$/, '');
  return base || DEFAULT_PUBLIC_SITE_BASE;
}

/** Path-based public URL: https://www.loomis.digital/s/{slug} */
export function publicSchoolSiteUrl(slug: string, envBase?: string | null): string {
  const normalized = slug.trim().toLowerCase();
  return `${resolvePublicSiteBaseUrl(envBase)}/s/${normalized}`;
}

/** Future subdomain form: https://{slug}.loomis.digital */
export function publicSchoolSubdomainUrl(slug: string, apexDomain = 'loomis.digital'): string {
  const normalized = slug.trim().toLowerCase();
  return `https://${normalized}.${apexDomain}`;
}

/** Slugify a school name for URL use. */
export function slugifySchoolName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'school';
}
