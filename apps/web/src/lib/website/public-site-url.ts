import {
  DEFAULT_PUBLIC_SITE_APEX,
  publicSchoolSiteUrl,
  resolvePublicSiteBaseUrl,
  type PublicSiteUrlMode,
} from '@loomis/core';

/** Apex domain for school subdomains (e.g. loomis.digital). */
export function getPublicSiteApexDomain(): string {
  return process.env.NEXT_PUBLIC_PUBLIC_SITE_APEX_DOMAIN || DEFAULT_PUBLIC_SITE_APEX;
}

/** Base URL for path-based fallback (e.g. https://www.loomis.digital). */
export function getPublicSiteBaseUrl(): string {
  return resolvePublicSiteBaseUrl(process.env.NEXT_PUBLIC_PUBLIC_SITE_BASE_URL);
}

/** 'subdomain' (default) or 'path' (local dev / no wildcard DNS). */
export function getPublicSiteUrlMode(): PublicSiteUrlMode {
  return process.env.NEXT_PUBLIC_PUBLIC_SITE_URL_MODE === 'path' ? 'path' : 'subdomain';
}

/** Canonical public URL for a school site (subdomain by default). */
export function schoolPublicSiteUrl(slug: string): string {
  return publicSchoolSiteUrl(slug, {
    mode: getPublicSiteUrlMode(),
    apexDomain: getPublicSiteApexDomain(),
    pathBaseUrl: getPublicSiteBaseUrl(),
  });
}

/**
 * Absolute login URL on the main app. Public sites run on a school subdomain
 * where a relative `/login` would loop back to the site, so portal links must
 * point at the main web app origin.
 */
export function getAppLoginUrl(): string {
  return `${getPublicSiteBaseUrl()}/login`;
}
