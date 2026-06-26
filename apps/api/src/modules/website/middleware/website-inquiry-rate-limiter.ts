import type { FastifyReply, FastifyRequest } from 'fastify';
import { LoomisError } from '../../../shared/errors.js';
import { getRedis } from '../../../shared/redis.js';

const WINDOW_SECONDS = 60 * 60;
const INQUIRY_LIMIT_PER_IP = 10;

function inquiryRateKey(slug: string, ip: string): string {
  return `website:inquiry:rate:${slug}:${ip}`;
}

/** Per-IP rate limit for public website inquiry submissions. */
export async function websiteInquiryRateLimiter(
  req: FastifyRequest<{ Params: { slug: string } }>,
  _reply: FastifyReply,
): Promise<void> {
  const redis = getRedis();
  const slug = req.params.slug.trim().toLowerCase();
  const key = inquiryRateKey(slug, req.ip);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  if (count > INQUIRY_LIMIT_PER_IP) {
    throw new LoomisError('RATE_LIMITED', 429, 'Too many enquiries from this address. Try again later.');
  }
}
