/**
 * Public school website URL helpers.
 * Production domain: loomis.digital.
 *
 * Primary public form is a per-school subdomain: https://{slug}.loomis.digital
 * Path form (https://www.loomis.digital/s/{slug}) is kept as a fallback for
 * local development and environments without wildcard DNS.
 *
 * Edge-safe: pure string logic only, no Node APIs (imported by Next middleware).
 */

export const DEFAULT_PUBLIC_SITE_APEX = 'loomis.digital';
const DEFAULT_PATH_BASE = 'https://www.loomis.digital';

export type PublicSiteUrlMode = 'subdomain' | 'path';

/**
 * Subdomains that are NOT school sites — never resolve these to a slug.
 * Keeps app/marketing/infra hostnames from being treated as schools.
 */
export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'mail',
  'mx',
  'smtp',
  'ftp',
  'dev',
  'staging',
  'static',
  'cdn',
  'assets',
  'status',
  'docs',
]);

/** Base URL for path-based school sites, e.g. https://www.loomis.digital */
export function resolvePublicSiteBaseUrl(envBase?: string | null): string {
  const base = (envBase ?? DEFAULT_PATH_BASE).replace(/\/$/, '');
  return base || DEFAULT_PATH_BASE;
}

function resolveApex(apexDomain?: string | null): string {
  const apex = (apexDomain ?? DEFAULT_PUBLIC_SITE_APEX).replace(/^\.+|\.+$/g, '');
  return apex || DEFAULT_PUBLIC_SITE_APEX;
}

export interface PublicSiteUrlConfig {
  /** 'subdomain' (default) → {slug}.apex; 'path' → {base}/s/{slug}. */
  mode?: PublicSiteUrlMode;
  /** Apex domain for subdomain mode (default loomis.digital). */
  apexDomain?: string | null;
  /** Base URL for path mode (default https://www.loomis.digital). */
  pathBaseUrl?: string | null;
}

/** Subdomain form: https://{slug}.loomis.digital */
export function publicSchoolSubdomainUrl(slug: string, apexDomain?: string | null): string {
  const normalized = slug.trim().toLowerCase();
  return `https://${normalized}.${resolveApex(apexDomain)}`;
}

/** Path form: https://www.loomis.digital/s/{slug} */
export function publicSchoolSitePathUrl(slug: string, envBase?: string | null): string {
  const normalized = slug.trim().toLowerCase();
  return `${resolvePublicSiteBaseUrl(envBase)}/s/${normalized}`;
}

/**
 * Canonical public URL for a school site. Subdomain by default; pass
 * `{ mode: 'path' }` (e.g. in local dev) to get the path form.
 */
export function publicSchoolSiteUrl(slug: string, config?: PublicSiteUrlConfig): string {
  const mode = config?.mode ?? 'subdomain';
  if (mode === 'path') {
    return publicSchoolSitePathUrl(slug, config?.pathBaseUrl);
  }
  return publicSchoolSubdomainUrl(slug, config?.apexDomain);
}

/** Slugify a school name for URL use. */
export function slugifySchoolName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72) || 'school'
  );
}

/**
 * Extracts a school slug from a request Host header for subdomain routing.
 * Returns null for the apex, `www`, other reserved subdomains, non-matching
 * hosts, IPs, and local hosts without a school subdomain.
 *
 * Supports dev apexes like `localhost` and `lvh.me` (e.g. grace.localhost).
 */
export function extractSchoolSlugFromHost(
  host: string | null | undefined,
  apexDomain?: string | null,
): string | null {
  if (!host) return null;

  // Strip port and lowercase.
  const hostname = host.split(':')[0]?.trim().toLowerCase();
  if (!hostname) return null;

  const apex = resolveApex(apexDomain);

  // Must end with `.{apex}` and have exactly one extra label (the slug).
  const suffix = `.${apex}`;
  if (!hostname.endsWith(suffix)) return null;

  const label = hostname.slice(0, -suffix.length);
  if (!label || label.includes('.')) return null; // apex itself, or multi-level
  if (RESERVED_SUBDOMAINS.has(label)) return null;

  // Validate slug shape (mirrors DB CHECK constraint).
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(label)) return null;

  return label;
}
