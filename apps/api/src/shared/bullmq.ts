import type { ConnectionOptions, DefaultJobOptions } from 'bullmq';
import { getEnv } from '../config/env.js';

/** BullMQ requires blocking Redis commands — do not use maxRetriesPerRequest: 3. */
export function bullmqConnectionOptions(): ConnectionOptions {
  const url = new URL(getEnv().REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    maxRetriesPerRequest: null,
    ...(url.password ? { password: url.password } : {}),
    ...(url.username && url.username !== 'default' ? { username: url.username } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

/**
 * Retention applied to every queue. Without this, completed/failed job hashes
 * accumulate in Redis forever — the high-frequency relay (every 1s) alone adds
 * ~86k records/day, which is what filled the Redis volume and broke logins.
 * Keep a small window for debugging, discard the rest.
 */
export const defaultQueueJobOptions: DefaultJobOptions = {
  removeOnComplete: { count: 20 },
  removeOnFail: { count: 100 },
};
