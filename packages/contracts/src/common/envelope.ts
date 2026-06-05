import { z } from 'zod';
import { apiError } from './errors.js';

/** Standard response envelope used by every Loomis API endpoint (System Design §4.1). */
export const responseMeta = z.object({
  requestId: z.string(),
  apiVersion: z.literal('v1'),
  timestamp: z.string().datetime(),
});

export type ResponseMeta = z.infer<typeof responseMeta>;

export function successEnvelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    status: z.literal('success'),
    data,
    meta: responseMeta,
  });
}

export const errorEnvelope = z.object({
  status: z.literal('error'),
  error: apiError,
  meta: responseMeta,
});

export type ErrorEnvelope = z.infer<typeof errorEnvelope>;

/** Inferred success-envelope type helper for the api-client. */
export type ApiResponse<T> = {
  status: 'success';
  data: T;
  meta: ResponseMeta;
};
