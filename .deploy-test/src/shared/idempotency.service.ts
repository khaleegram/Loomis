import { getRedis } from './redis.js';

const TTL_SECONDS = 86_400;

/**
 * Redis-backed idempotency wrapper (loomis-financial-integrity). Stores the
 * serialized result for 24h and returns the cached payload on duplicate keys.
 */
export const idempotencyService = {
  async wrap<T>(
    key: string,
    userId: string,
    endpoint: string,
    fn: () => Promise<T>,
  ): Promise<{ result: T; replayed: boolean }> {
    const redisKey = `idempotency:${userId}:${endpoint}:${key}`;
    const existing = await getRedis().get(redisKey);
    if (existing) {
      return { result: JSON.parse(existing) as T, replayed: true };
    }

    const result = await fn();
    await getRedis().set(redisKey, JSON.stringify(result), 'EX', TTL_SECONDS);
    return { result, replayed: false };
  },
};
