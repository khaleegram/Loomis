import type { ConnectionOptions } from 'bullmq';
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
