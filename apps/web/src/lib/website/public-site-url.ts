import { publicSchoolSiteUrl, resolvePublicSiteBaseUrl } from '@loomis/core';

/** Client/server helper — uses NEXT_PUBLIC_PUBLIC_SITE_BASE_URL when set. */
export function getPublicSiteBaseUrl(): string {
  return resolvePublicSiteBaseUrl(process.env.NEXT_PUBLIC_PUBLIC_SITE_BASE_URL);
}

export function schoolPublicSiteUrl(slug: string): string {
  return publicSchoolSiteUrl(slug, getPublicSiteBaseUrl());
}
