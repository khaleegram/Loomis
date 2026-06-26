import { z } from 'zod';

/**
 * Single source of truth for environment configuration (loomis-security rule).
 * Modules import from here — never access process.env directly.
 * In production these values come from AWS Secrets Manager via the ECS task role.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** API listen port. Cloud hosts (Railway, Render) set `PORT`; we fall back to that. */
  API_PORT: z.preprocess(
    (value) => (value !== undefined && value !== '' ? value : process.env.PORT),
    z.coerce.number().int().default(8080),
  ),

  DATABASE_URL: z.string().url(),
  DATABASE_AUDIT_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().default(28_800),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().default(2_592_000),
  REFRESH_TOKEN_HMAC_SECRET: z.string().min(1),
  /** HMAC key for referral code hashing (FR-REF-003). Raw codes are never stored. */
  REFERRAL_CODE_HMAC_SECRET: z.string().min(1),
  TOTP_ENCRYPTION_KEY: z.string().min(1),
  TOTP_ISSUER: z.string().default('Loomis'),

  /** Private S3 bucket for all object storage (System Design §10). */
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  /**
   * When true, uploads stay `upload_pending` until ClamAV publishes `storage.object.scan_completed`.
   * Default false until the Lambda scan worker is deployed (Railway / dev without scan infra).
   */
  STORAGE_MALWARE_SCAN_ENABLED: z.preprocess(
    (value) => value === true || value === 'true' || value === '1',
    z.boolean().default(false),
  ),

  /** Paystack (SRS §10.1 / System Design §9). Webhook HMAC uses secret key if webhook secret omitted. */
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),

  /** Base URL for gateway redirect after online payment (parent portal). */
  PAYMENT_REDIRECT_BASE_URL: z.string().url().optional(),
  /** Deep link / mobile return URL after Paystack checkout (e.g. loomis://payments/complete). */
  PAYMENT_REDIRECT_MOBILE_URL: z.string().min(1).optional(),

  /** Public web app origin for links in transactional emails (defaults to http://localhost:3000 in dev). */
  WEB_APP_BASE_URL: z.string().url().optional(),

  /** Base URL for path-based school public sites (e.g. https://www.loomis.digital). */
  PUBLIC_SITE_BASE_URL: z.string().url().default('https://www.loomis.digital'),

  /** Resend (SRS §10.3). Required for email delivery when email channel is used. */
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  /** Termii SMS (SRS §10.3). Required for SMS delivery when SMS channel is used. */
  TERMII_API_KEY: z.string().min(1).optional(),
  TERMII_SENDER_ID: z.string().min(1).optional(),
  /**
   * Demo/staging only: accept SMS OTP `000000` without Termii (see loomis-roles-and-logins.md).
   * Use when the Termii sender ID is not approved yet.
   */
  SMS_OTP_DEMO_BYPASS: z.preprocess(
    (value) => value === true || value === 'true' || value === '1',
    z.boolean().default(false),
  ),

  /** Firebase Cloud Messaging (SRS §10.4 / MOB-004). Required for Android push. */
  FCM_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),

  /** Apple Push Notification Service (SRS §10.4 / MOB-004). Required for iOS push. */
  APNS_KEY_ID: z.string().min(1).optional(),
  APNS_TEAM_ID: z.string().min(1).optional(),
  APNS_BUNDLE_ID: z.string().min(1).optional(),
  APNS_PRIVATE_KEY: z.string().min(1).optional(),

  /** Web Push VAPID keys for PWA notifications (US-PAR-002). Generate with `npx web-push generate-vapid-keys`. */
  WEB_PUSH_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  WEB_PUSH_VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  WEB_PUSH_VAPID_SUBJECT: z.string().min(1).optional(),
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
