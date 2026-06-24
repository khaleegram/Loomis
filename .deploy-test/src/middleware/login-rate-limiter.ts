import type { FastifyReply, FastifyRequest } from 'fastify';
import { LoomisError } from '../shared/errors.js';
import { getRedis } from '../shared/redis.js';
import { userRepository } from '../modules/identity/repository/user.repository.js';

const IP_WINDOW_SECONDS = 10 * 60;
/** Per-IP ceiling on login attempts — complements per-account lockout (SEC-AUTH-006). */
const IP_ATTEMPT_LIMIT = 30;

function loginIpRateKey(ip: string): string {
  return `identity:login:rate:ip:${ip}`;
}

/**
 * Pre-handler for POST /auth/login. Rejects already-locked accounts before
 * password verification and applies a per-IP sliding-window rate limit.
 * Account lockout after 5 failed attempts is enforced in auth.service.
 */
export async function loginRateLimiter(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const body = req.body as { email?: string } | undefined;
  const email = body?.email?.trim().toLowerCase();

  if (email && (await userRepository.isAccountLocked(email))) {
    throw new LoomisError('IDENTITY_ACCOUNT_LOCKED', 423, 'Account is temporarily locked');
  }

  const redis = getRedis();
  const key = loginIpRateKey(req.ip);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, IP_WINDOW_SECONDS);
  }
  if (count > IP_ATTEMPT_LIMIT) {
    throw new LoomisError('RATE_LIMITED', 429, 'Too many login attempts from this address');
  }
}
