import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { ZodError } from 'zod';
import type { LoomisErrorCode } from '@loomis/contracts';
import { LoomisError } from './errors.js';

function buildMeta(req: FastifyRequest) {
  return {
    requestId: req.id,
    apiVersion: 'v1' as const,
    timestamp: new Date().toISOString(),
  };
}

/** Standard success envelope (System Design §4.1 / loomis-api rule). */
export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200): FastifyReply {
  return reply.code(statusCode).send({
    status: 'success',
    data,
    meta: buildMeta(reply.request),
  });
}

/**
 * Fastify plugin: decorates `reply.loomisError(...)` and installs the global
 * error handler that turns LoomisError and Zod failures into the standard
 * error envelope. Never leak raw Fastify errors (loomis-api rule).
 */
export function registerHttpErrorHandling(app: FastifyInstance): void {
  app.decorateReply(
    'loomisError',
    function (
      this: FastifyReply,
      code: LoomisErrorCode,
      message: string,
      statusCode = 400,
      details?: Record<string, unknown>,
    ) {
      return this.code(statusCode).send({
        status: 'error',
        error: {
          code,
          message,
          requestId: this.request.id,
          ...(details !== undefined ? { details } : {}),
        },
        meta: buildMeta(this.request),
      });
    },
  );

  app.setErrorHandler((err: FastifyError | LoomisError | ZodError, req, reply) => {
    if (err instanceof LoomisError) {
      return reply.loomisError(err.code, err.message, err.statusCode, err.details);
    }

    if (err instanceof ZodError) {
      return reply.loomisError('VALIDATION_ERROR', 'Request validation failed', 400, {
        issues: err.flatten().fieldErrors,
      });
    }

    // Fastify schema validation failures surface as validation errors too.
    if ((err as FastifyError).validation) {
      return reply.loomisError('VALIDATION_ERROR', err.message, 400, {
        validation: (err as FastifyError).validation,
      });
    }

    const statusCode = (err as FastifyError).statusCode ?? 500;
    if (statusCode === 429) {
      return reply.loomisError('RATE_LIMITED', 'Too many requests', 429);
    }
    if (statusCode < 500) {
      // Known client error without a Loomis code — do not leak internals.
      return reply.loomisError('VALIDATION_ERROR', err.message, statusCode);
    }

    // Unexpected: log with request id only, never the payload (loomis-security).
    req.log.error({ err, requestId: req.id }, 'unhandled_error');
    return reply.loomisError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  });
}
