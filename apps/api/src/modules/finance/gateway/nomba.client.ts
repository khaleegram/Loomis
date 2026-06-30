import { createHmac, timingSafeEqual } from 'node:crypto';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';

const DEFAULT_SANDBOX_BASE = 'https://sandbox.nomba.com';

export interface NombaConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  parentAccountId: string;
  subAccountId: string | null;
  webhookSecret: string | null;
}

export function isNombaConfigured(): boolean {
  try {
    resolveNombaConfig();
    return true;
  } catch {
    return false;
  }
}

export function resolveNombaConfig(): NombaConfig {
  const env = getEnv();
  const clientSecret = env.NOMBA_CLIENT_SECRET ?? env.NOMBA_PRIVATE_KEY;
  const clientId = env.NOMBA_CLIENT_ID;
  const parentAccountId = env.NOMBA_PARENT_ACCOUNT_ID;
  const baseUrl = env.NOMBA_BASE_URL ?? DEFAULT_SANDBOX_BASE;

  if (!clientId || !clientSecret || !parentAccountId) {
    throw new LoomisError(
      'FINANCE_GATEWAY_NOT_CONFIGURED',
      503,
      'Nomba is not configured — set NOMBA_CLIENT_ID, NOMBA_CLIENT_SECRET (or NOMBA_PRIVATE_KEY), and NOMBA_PARENT_ACCOUNT_ID',
    );
  }

  return {
    baseUrl,
    clientId,
    clientSecret,
    parentAccountId,
    subAccountId: env.NOMBA_SUB_ACCOUNT_ID ?? null,
    webhookSecret: env.NOMBA_WEBHOOK_SECRET ?? null,
  };
}

interface CachedToken {
  accessToken: string;
  refreshToken: string | null;
  expiresAtMs: number;
}

let tokenCache: CachedToken | null = null;

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

async function issueToken(config: NombaConfig): Promise<CachedToken> {
  const response = await fetch(`${config.baseUrl}/v1/auth/token/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accountId: config.parentAccountId,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  const body = (await response.json()) as {
    code?: string;
    description?: string;
    data?: {
      access_token?: string;
      refresh_token?: string;
      expiresAt?: string;
    };
  };

  if (!response.ok || body.code !== '00' || !body.data?.access_token) {
    throw new LoomisError(
      'FINANCE_GATEWAY_UNAVAILABLE',
      502,
      body.description ?? 'Nomba authentication failed',
    );
  }

  const expiresAtMs = body.data.expiresAt
    ? new Date(body.data.expiresAt).getTime()
    : Date.now() + 25 * 60 * 1000;

  return {
    accessToken: body.data.access_token,
    refreshToken: body.data.refresh_token ?? null,
    expiresAtMs,
  };
}

async function refreshToken(config: NombaConfig, refresh: string): Promise<CachedToken> {
  const response = await fetch(`${config.baseUrl}/v1/auth/token/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accountId: config.parentAccountId,
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh,
    }),
  });

  const body = (await response.json()) as {
    code?: string;
    description?: string;
    data?: {
      access_token?: string;
      refresh_token?: string;
      expiresAt?: string;
    };
  };

  if (!response.ok || body.code !== '00' || !body.data?.access_token) {
    return issueToken(config);
  }

  const expiresAtMs = body.data.expiresAt
    ? new Date(body.data.expiresAt).getTime()
    : Date.now() + 25 * 60 * 1000;

  return {
    accessToken: body.data.access_token,
    refreshToken: body.data.refresh_token ?? refresh,
    expiresAtMs,
  };
}

export async function getNombaAccessToken(): Promise<string> {
  const config = resolveNombaConfig();
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs - now > 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  if (tokenCache?.refreshToken) {
    tokenCache = await refreshToken(config, tokenCache.refreshToken);
  } else {
    tokenCache = await issueToken(config);
  }

  return tokenCache.accessToken;
}

export interface CreateNombaVirtualAccountInput {
  accountRef: string;
  accountName: string;
}

export interface CreateNombaVirtualAccountResult {
  accountRef: string;
  accountNumber: string;
  bankName: string;
  accountName: string;
  accountHolderId: string | null;
}

export async function createNombaVirtualAccount(
  input: CreateNombaVirtualAccountInput,
): Promise<CreateNombaVirtualAccountResult> {
  const config = resolveNombaConfig();
  const token = await getNombaAccessToken();
  const url = new URL(`${config.baseUrl}/v1/accounts/virtual`);
  if (config.subAccountId) {
    url.searchParams.set('subAccountId', config.subAccountId);
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      accountId: config.parentAccountId,
    },
    body: JSON.stringify({
      accountRef: input.accountRef,
      accountName: input.accountName,
      currency: 'NGN',
    }),
  });

  const body = (await response.json()) as {
    code?: string;
    description?: string;
    data?: {
      accountRef?: string;
      bankAccountNumber?: string;
      bankName?: string;
      bankAccountName?: string;
      accountName?: string;
      accountHolderId?: string;
    };
  };

  if (!response.ok || body.code !== '00' || !body.data?.bankAccountNumber) {
    throw new LoomisError(
      'FINANCE_GATEWAY_UNAVAILABLE',
      502,
      body.description ?? 'Nomba virtual account creation failed',
    );
  }

  return {
    accountRef: body.data.accountRef ?? input.accountRef,
    accountNumber: body.data.bankAccountNumber,
    bankName: body.data.bankName ?? 'Nomba',
    accountName: body.data.bankAccountName ?? body.data.accountName ?? input.accountName,
    accountHolderId: body.data.accountHolderId ?? null,
  };
}

export function verifyNombaWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
): boolean {
  const config = resolveNombaConfig();
  if (!config.webhookSecret) {
    return false;
  }

  const signature = headerValue(headers, 'nomba-signature') ?? headerValue(headers, 'nomba-sig-value');
  const timestamp = headerValue(headers, 'nomba-timestamp');
  if (!signature || !timestamp) {
    return false;
  }

  const payload = JSON.parse(rawBody) as {
    event_type?: string;
    requestId?: string;
    data?: {
      merchant?: { userId?: string; walletId?: string };
      transaction?: {
        transactionId?: string;
        type?: string;
        time?: string;
        responseCode?: string | null;
      };
    };
  };

  const merchant = payload.data?.merchant ?? {};
  const transaction = payload.data?.transaction ?? {};
  let responseCode = transaction.responseCode ?? '';
  if (responseCode === 'null') {
    responseCode = '';
  }

  const hashingPayload = [
    payload.event_type ?? '',
    payload.requestId ?? '',
    merchant.userId ?? '',
    merchant.walletId ?? '',
    transaction.transactionId ?? '',
    transaction.type ?? '',
    transaction.time ?? '',
    responseCode,
    timestamp,
  ].join(':');

  const hash = createHmac('sha256', config.webhookSecret).update(hashingPayload).digest('base64');

  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function parseNombaWebhookEvent(rawBody: string) {
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const transaction = (data.transaction ?? {}) as Record<string, unknown>;
  const eventType = String(payload.event_type ?? 'unknown');
  const requestId = String(payload.requestId ?? payload.request_id ?? '');
  const transactionId = String(transaction.transactionId ?? '');
  const providerEventId = transactionId || requestId || `${eventType}:${Date.now()}`;
  const accountRef =
    typeof transaction.aliasAccountReference === 'string' ? transaction.aliasAccountReference : null;
  const paidAt = typeof transaction.time === 'string' ? new Date(transaction.time) : null;
  const amountNaira = Number(transaction.transactionAmount ?? Number.NaN);
  const amountMinor = Number.isFinite(amountNaira) ? Math.round(amountNaira * 100) : null;
  const txType = String(transaction.type ?? '');
  const isVaTransfer = txType === 'vact_transfer' || Boolean(accountRef);
  const status =
    eventType === 'payment_success' && isVaTransfer
      ? 'success'
      : eventType === 'payment_failed'
        ? 'failed'
        : 'unknown';

  return {
    providerEventId,
    eventType,
    providerTimestamp: paidAt,
    gatewayReference: transactionId || null,
    amountMinor,
    status: status as 'success' | 'failed' | 'unknown',
    tenantId: null as string | null,
    paymentId: null as string | null,
    virtualAccountRef: accountRef,
    raw: payload,
  };
}
