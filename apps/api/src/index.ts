import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { uuidv7 } from 'uuidv7';
import { getEnv } from './config/env.js';
import { registerHttpErrorHandling } from './shared/http.js';
import { identityModule } from './modules/identity/index.js';
import { tenantModule } from './modules/tenant/index.js';
import { hrmModule } from './modules/hrm/index.js';
import { academicModule } from './modules/academic/index.js';
import { studentModule } from './modules/student/index.js';
import { financeModule } from './modules/finance/index.js';
import { ledgerModule } from './modules/ledger/index.js';
import { riskModule } from './modules/risk/index.js';
import { workflowModule } from './modules/workflow/index.js';
import { storageModule } from './modules/storage/index.js';

/**
 * Fastify bootstrap. Domain modules register as plugins under /api/v1
 * following the module structure (loomis-module-patterns rule).
 * Phase 1 order: identity -> tenant -> hrm -> academic -> student (complete).
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

  registerHttpErrorHandling(app);

  app.get('/health', async () => ({ status: 'ok', service: 'loomis-api' }));

  // Phase 1 modules register under /api/v1 (identity -> tenant -> ...).
  await app.register(identityModule, { prefix: '/api/v1' });
  await app.register(tenantModule, { prefix: '/api/v1' });
  await app.register(hrmModule, { prefix: '/api/v1' });
  await app.register(academicModule, { prefix: '/api/v1' });
  await app.register(studentModule, { prefix: '/api/v1' });
  await app.register(workflowModule, { prefix: '/api/v1' });
  await app.register(ledgerModule, { prefix: '/api/v1' });
  await app.register(riskModule, { prefix: '/api/v1' });
  await app.register(financeModule, { prefix: '/api/v1' });
  await app.register(storageModule, { prefix: '/api/v1' });

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
