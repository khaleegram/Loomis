import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'jose';
import type { Role } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';
import { getRedis } from '../../../shared/redis.js';
import { userRepository } from '../repository/user.repository.js';
import type { AccessTokenPayload, VerifiedAccessToken } from '../types.js';

const JWT_ISSUER = 'https://api.loomis.ng';
const JWT_AUDIENCE = 'loomis-api';
const USER_VER_CACHE_TTL_SECONDS = 30;
const JTI_BLACKLIST_KEY = 'identity:jti:blacklist';

let privateKey: CryptoKey | null = null;
let publicKey: CryptoKey | null = null;

async function getPrivateKey(): Promise<CryptoKey> {
  if (!privateKey) {
    const env = getEnv();
    privateKey = await importPKCS8(normalizePem(env.JWT_PRIVATE_KEY), 'RS256');
  }
  return privateKey;
}

async function getPublicKey(): Promise<CryptoKey> {
  if (!publicKey) {
    const env = getEnv();
    publicKey = await importSPKI(normalizePem(env.JWT_PUBLIC_KEY), 'RS256');
  }
  return publicKey;
}

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, '\n').trim();
}

function userVerCacheKey(userId: string): string {
  return `user:ver:${userId}`;
}

export const tokenService = {
  async signAccessToken(payload: AccessTokenPayload): Promise<{
    token: string;
    jti: string;
    expiresAt: Date;
  }> {
    const env = getEnv();
    const jti = uuidv7();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + env.JWT_ACCESS_TTL_SECONDS;

    const claims: Record<string, unknown> = {
      role: payload.role,
      tenant_id: payload.tenantId,
      session_id: payload.sessionId,
      user_ver: payload.userVer,
    };
    if (payload.mfaAt !== undefined) claims['mfa_at'] = payload.mfaAt;
    if (payload.deviceId !== undefined) claims['device_id'] = payload.deviceId;

    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject(payload.sub)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setJti(jti)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(await getPrivateKey());

    return {
      token,
      jti,
      expiresAt: new Date(exp * 1000),
    };
  },

  async verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
    try {
      const { payload } = await jwtVerify(token, await getPublicKey(), {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });

      const sub = payload.sub;
      const jti = payload.jti;
      const role = payload.role;
      const tenantId = payload.tenant_id;
      const sessionId = payload.session_id;
      const userVer = payload.user_ver;
      const iat = payload.iat;
      const exp = payload.exp;

      if (
        typeof sub !== 'string' ||
        typeof jti !== 'string' ||
        typeof role !== 'string' ||
        (tenantId !== null && typeof tenantId !== 'string') ||
        typeof sessionId !== 'string' ||
        typeof userVer !== 'number' ||
        typeof iat !== 'number' ||
        typeof exp !== 'number'
      ) {
        throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Invalid access token claims');
      }

      if (await this.isJtiBlacklisted(jti)) {
        throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Token has been revoked');
      }

      const verified: VerifiedAccessToken = {
        sub,
        jti,
        role: role as Role,
        tenantId: (tenantId as string | null) ?? null,
        sessionId,
        userVer,
        iat,
        exp,
      };

      if (typeof payload.mfa_at === 'number') verified.mfaAt = payload.mfa_at;
      if (payload.device_id === null || typeof payload.device_id === 'string') {
        verified.deviceId = (payload.device_id as string | null) ?? null;
      }

      return verified;
    } catch (err) {
      if (err instanceof LoomisError) throw err;
      throw new LoomisError('IDENTITY_TOKEN_EXPIRED', 401, 'Access token is invalid or expired');
    }
  },

  async assertUserVerValid(userId: string, tokenUserVer: number): Promise<void> {
    const current = await this.getUserVer(userId);
    if (current === null || current !== tokenUserVer) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Session has been invalidated');
    }
  },

  async getUserVer(userId: string): Promise<number | null> {
    const redis = getRedis();
    const cacheKey = userVerCacheKey(userId);
    const cached = await redis.get(cacheKey);
    if (cached !== null) return Number.parseInt(cached, 10);

    const userVer = await userRepository.getUserVer(userId);
    if (userVer === null) return null;

    await redis.setex(cacheKey, USER_VER_CACHE_TTL_SECONDS, String(userVer));
    return userVer;
  },

  /** Write-through cache update after user_ver bump (System Design §5.1). */
  async setUserVerCache(userId: string, userVer: number): Promise<void> {
    const redis = getRedis();
    await redis.setex(userVerCacheKey(userId), USER_VER_CACHE_TTL_SECONDS, String(userVer));
  },

  async invalidateUserVerCache(userId: string): Promise<void> {
    await getRedis().del(userVerCacheKey(userId));
  },

  async blacklistJti(jti: string, expiresAt: Date): Promise<void> {
    const redis = getRedis();
    const score = expiresAt.getTime();
    await redis.zadd(JTI_BLACKLIST_KEY, score, jti);
    await this.pruneExpiredJtis();
  },

  async isJtiBlacklisted(jti: string): Promise<boolean> {
    const redis = getRedis();
    const score = await redis.zscore(JTI_BLACKLIST_KEY, jti);
    if (score === null) return false;
    return Number.parseInt(score, 10) > Date.now();
  },

  async pruneExpiredJtis(): Promise<void> {
    const redis = getRedis();
    await redis.zremrangebyscore(JTI_BLACKLIST_KEY, 0, Date.now());
  },

  generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  },

  hashRefreshToken(rawToken: string): string {
    const env = getEnv();
    return createHmac('sha256', env.REFRESH_TOKEN_HMAC_SECRET)
      .update(rawToken)
      .digest('hex');
  },

  verifyRefreshTokenHash(rawToken: string, expectedHash: string): boolean {
    const actual = this.hashRefreshToken(rawToken);
    const a = Buffer.from(actual, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  },

  getRefreshTokenExpiresAt(): Date {
    const env = getEnv();
    return new Date(Date.now() + env.JWT_REFRESH_TTL_SECONDS * 1000);
  },
};
