import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { uuidv7 } from 'uuidv7';
import { getEnv } from './config/env.js';

/**
 * Fastify bootstrap. Domain modules register as plugins under /api/v1
 * following the module structure (loomis-module-patterns rule).
 * Phase 1 order: identity -> tenant -> hrm -> academic -> student.
 */
async function buildServer() {
  const env = getEnv();

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      // X-Request-Id correlates client logs, server logs, and audit events.
      redact: ['req.headers.authorization', 'req.headers["x-mfa-token"]'],
    },
    genReqId: (req) => (req.headers['x-request-id'] as string) ?? uuidv7(),
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true, credentials: true });

  app.get('/health', async () => ({ status: 'ok', service: 'loomis-api' }));

  // TODO Phase 1: register module plugins under /api/v1
  //   await app.register(identityModule, { prefix: '/api/v1' });
  //   await app.register(tenantModule,   { prefix: '/api/v1' });
  //   ...

  return app;
}

async function main() {
  const env = getEnv();
  const app = await buildServer();
  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});
