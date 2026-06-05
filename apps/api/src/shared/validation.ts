import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeAny, infer as ZodInfer } from 'zod';

/**
 * Returns a preValidation hook that validates the request body against a Zod
 * schema (loomis-api rule: Zod for ALL request validation). On success the
 * parsed (and defaulted) value replaces req.body; on failure the ZodError is
 * thrown and formatted by the global error handler. Missing bodies are treated
 * as `{}` so schemas with all-optional fields and defaults still apply.
 */
export function validateBody<S extends ZodTypeAny>(schema: S) {
  return async function validateBodyHook(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const parsed: ZodInfer<S> = schema.parse(req.body ?? {});
    req.body = parsed;
  };
}

/** Validates route params against a Zod schema (same pattern as validateBody). */
export function validateParams<S extends ZodTypeAny>(schema: S) {
  return async function validateParamsHook(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const parsed: ZodInfer<S> = schema.parse(req.params ?? {});
    req.params = parsed;
  };
}
