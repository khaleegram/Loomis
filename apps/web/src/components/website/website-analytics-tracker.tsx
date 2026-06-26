'use client';

import { useEffect } from 'react';

import { resolveApiBaseUrl } from '@/lib/api/resolve-api-base-url';

export function WebsiteAnalyticsTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const base = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
    const body = JSON.stringify({
      path: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer || undefined,
    });

    void fetch(`${base}/public/sites/${encodeURIComponent(slug)}/page-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must never interrupt the public school website.
    });
  }, [slug]);

  return null;
}
