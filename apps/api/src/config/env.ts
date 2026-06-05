import { z } from 'zod';

/**
 * Single source of truth for environment configuration (loomis-security rule).
 * Modules import from here — never access process.env directly.
 * In production these values come from AWS Secrets Manager via the ECS task role.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().default(8080),

  DATABASE_URL: z.string().url(),
  DATABASE_AUDIT_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().default(28_800),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().default(2_592_000),
  REFRESH_TOKEN_HMAC_SECRET: z.string().min(1),
  TOTP_ENCRYPTION_KEY: z.string().min(1),
  TOTP_ISSUER: z.string().default('Loomis'),

  /** Private S3 bucket for all object storage (System Design §10). */
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast and loud — never boot with an invalid/missing config.
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    throw new Error('Environment validation failed');
  }
  cached = parsed.data;
  return cached;
}
