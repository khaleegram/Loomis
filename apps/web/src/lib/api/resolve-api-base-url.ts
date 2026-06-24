/**
 * Resolves the Fastify API base URL for production.
 *
 * Vercel is configured with `api.loomis.digital`, but that hostname only works
 * after a DNS CNAME is added at the domain registrar. Until then, route traffic
 * through the Railway service URL so login and API calls do not 502.
 *
 * Set `LOOMIS_API_CUSTOM_DOMAIN_READY=true` on Vercel once DNS + Railway TLS
 * are verified for api.loomis.digital.
 */
export const RAILWAY_PRODUCTION_API = 'https://loomis-api-production.up.railway.app/api/v1';

const DEV_DEFAULT = 'http://localhost:18080/api/v1';

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

function railwayFallback(): string {
  return (
    process.env.LOOMIS_API_RAILWAY_FALLBACK?.replace(/\/$/, '') ?? RAILWAY_PRODUCTION_API
  );
}

export function resolveApiBaseUrl(configured: string | undefined): string {
  const fallback = railwayFallback();
  const url = (configured ?? (isProd() ? fallback : DEV_DEFAULT)).replace(/\/$/, '');

  if (
    isProd() &&
    url.includes('api.loomis.digital') &&
    process.env.LOOMIS_API_CUSTOM_DOMAIN_READY !== 'true'
  ) {
    return fallback;
  }

  return url;
}
