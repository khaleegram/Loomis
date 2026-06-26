import type { PublicWebsiteSiteResponse } from '@loomis/contracts';

import { resolveApiBaseUrl } from '@/lib/api/resolve-api-base-url';

type ApiEnvelope<T> = { status: string; data: T };

export async function fetchPublicSite(slug: string): Promise<PublicWebsiteSiteResponse | null> {
  const base = resolveApiBaseUrl(
    process.env.LOOMIS_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
  );
  const res = await fetch(`${base}/public/sites/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as ApiEnvelope<PublicWebsiteSiteResponse>;
  return json.data ?? null;
}
