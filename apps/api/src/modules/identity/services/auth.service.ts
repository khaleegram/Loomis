import type { Role, StepUpAction } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import {
  advancedOptionalTotpLogin,
  coreLoginRequiresSms,
  extractStaffExtensionRoles,
  mergeExperienceFlags,
  stepUpUsesSms,
} from '@loomis/core';
import { resolveStaffEffectiveRoles } from '../../hrm/services/staff-role-resolver.js';
import { db } from '../../../shared/db.js';
import { LoomisError } from '../../../shared/errors.js';
import { getRedis } from '../../../shared/redis.js';
import { mfaRepository } from '../repository/mfa.repository.js';
import { sessionRepository } from '../repository/session.repository.js';
import { tokenRepository } from '../repository/token.repository.js';
import { userRepository } from '../repository/user.repository.js';
import { MFA_MANDATORY_ROLES } from '../types.js';
import type { AccessTokenPayload, DevicePlatform } from '../types.js';
import { deviceService } from './device.service.js';
import { mfaService } from './mfa.service.js';
import { passwordService } from './password.service.js';
import { sessionService } from './session.service.js';
import { smsOtpService } from './sms-otp.service.js';
import { loadTenantMfaContext } from './tenant-mfa-context.js';
import { tokenService } from './token.service.js';

const LOCKOUT_WINDOW_MS = 10 * 60 * 1000;
const LOCKOUT_THRESHOLD = 5;
const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;
const MFA_CHALLENGE_MAX_ATTEMPTS = 5;

function mfaChallengeKey(challengeId: string): string {
  return `identity:mfa:challenge:${challengeId}`;
}

interface MfaChallengePayload {
  userId: string;
  platform: DevicePlatform;
  deviceFingerprint: string | null;
  attempts: number;
  channel: 'sms' | 'totp';
}

export interface LoginContext {
  platform: DevicePlatform;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  persistentToken?: string;
}

export interface RequestContext {
  platform: DevicePlatform;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthenticatedBundle {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
  role: Role;
  tenantId: string | null;
  sessionId: string;
  deviceId: string | null;
  displacedSessionId: string | null;
  mustChangePassword?: boolean;
  displayName?: string;
  persistentToken?: string;
  persistentTokenExpiresAt?: Date;
  staffExtensionRoles?: Role[];
}

async function loadStaffExtensionRoles(user: {
  id: string;
  role: string;
  tenantId: string | null;
}): Promise<Role[]> {
  if (!user.tenantId) return [];
  const effective = await resolveStaffEffectiveRoles(
    user.tenantId,
    user.id,
    user.role as Role,
  );
  return extractStaffExtensionRoles(user.role as Role, effective);
}

export type LoginResult =
  | { kind: 'authenticated'; bundle: AuthenticatedBundle }
  | {
      kind: 'mfa_required';
      mfaChallengeId: string;
      channel: 'sms' | 'totp';
      maskedPhone?: string;
      devBypass?: boolean;
    }
  | { kind: 'mfa_enrollment_required'; enrollmentToken: string };

type UserRow = NonNullable<Awaited<ReturnType<typeof userRepository.findByEmail>>>;

interface IssueOptions {
  mfaCompleted: boolean;
  deviceId?: string;
  persistentToken?: string;
  persistentTokenExpiresAt?: Date;
}

export const authService = {
  /**
   * Email + password login (SEC-AUTH-001). Resolves to one of three outcomes:
   *  - authenticated:             tokens issued (no MFA, or reduced-friction device).
   *  - mfa_required:              active MFA — a TOTP challenge must be solved.
   *  - mfa_enrollment_required:   platform role without active MFA; account is locked
   *                               until enrolled (SEC-AUTH-002/003).
   */
  async login(email: string, password: string, ctx: LoginContext): Promise<LoginResult> {
    if (await userRepository.isAccountLocked(email)) {
      throw new LoomisError('IDENTITY_ACCOUNT_LOCKED', 423, 'Account is temporarily locked');
    }

    const user = await userRepository.findByEmail(email);
    const validPassword = user ? await passwordService.verify(password, user.passwordHash) : false;

    if (!user || !validPassword) {
      await userRepository.recordLoginAttempt({
        email,
        success: false,
        failureReason: user ? 'bad_password' : 'unknown_user',
        ...(ctx.ipAddress !== undefined ? { ipAddress: ctx.ipAddress } : {}),
        ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
      });
      await this.enforceLockoutThreshold(email, user);
      throw new LoomisError('IDENTITY_INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    if (user.status === 'pending') {
      throw new LoomisError('FORBIDDEN', 403, 'Account setup is pending');
    }
    if (user.status === 'deactivated') {
      throw new LoomisError('FORBIDDEN', 403, 'Account is deactivated');
    }
    if (user.status === 'locked' && user.lockedUntil && user.lockedUntil > new Date()) {
      throw new LoomisError('IDENTITY_ACCOUNT_LOCKED', 423, 'Account is temporarily locked');
    }

    await userRepository.recordLoginAttempt({
      email,
      success: true,
      ...(ctx.ipAddress !== undefined ? { ipAddress: ctx.ipAddress } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    if (user.mustChangePassword) {
      const bundle = await this.issueAuthenticatedSession(user, ctx, { mfaCompleted: false });
      return { kind: 'authenticated', bundle: { ...bundle, mustChangePassword: true } };
    }

    const role = user.role as Role;
    const loginRequiresMfa = MFA_MANDATORY_ROLES.has(role);

    if (loginRequiresMfa) {
      const mfaConfig = await mfaRepository.findByUserId(user.id);
      const mfaMandatory = user.mfaRequired || MFA_MANDATORY_ROLES.has(role);
      const mfaActive = mfaConfig?.status === 'active';

      if (mfaActive) {
        // Reduced MFA friction for a recognised device (SEC-AUTH-014).
        if (ctx.persistentToken && ctx.deviceFingerprint) {
          const deviceId = await deviceService.verifyPersistentToken(
            user.id,
            ctx.deviceFingerprint,
            ctx.persistentToken,
          );
          if (deviceId) {
            const bundle = await this.issueAuthenticatedSession(user, ctx, {
              mfaCompleted: true,
              deviceId,
            });
            return { kind: 'authenticated', bundle };
          }
        }
        const mfaChallengeId = await this.createMfaChallenge(user.id, ctx, 'totp');
        return { kind: 'mfa_required', mfaChallengeId, channel: 'totp' as const };
      }

      if (mfaMandatory) {
        const { token } = await tokenService.signEnrollmentToken(user.id);
        return { kind: 'mfa_enrollment_required', enrollmentToken: token };
      }
    }

    const tenantCtx = await loadTenantMfaContext(user.tenantId);
    const enrolledMfa = await mfaRepository.findByUserId(user.id);
    if (enrolledMfa?.status === 'active') {
      if (ctx.persistentToken && ctx.deviceFingerprint) {
        const deviceId = await deviceService.verifyPersistentToken(
          user.id,
          ctx.deviceFingerprint,
          ctx.persistentToken,
        );
        if (deviceId) {
          const bundle = await this.issueAuthenticatedSession(user, ctx, {
            mfaCompleted: true,
            deviceId,
          });
          return { kind: 'authenticated', bundle };
        }
      }
      const mfaChallengeId = await this.createMfaChallenge(user.id, ctx, 'totp');
      return { kind: 'mfa_required', mfaChallengeId, channel: 'totp' as const };
    }

    if (
      tenantCtx &&
      coreLoginRequiresSms(
        role,
        tenantCtx.experienceTier,
        mergeExperienceFlags(tenantCtx.experienceFlags),
      )
    ) {
      if (ctx.persistentToken && ctx.deviceFingerprint) {
        const deviceId = await deviceService.verifyPersistentToken(
          user.id,
          ctx.deviceFingerprint,
          ctx.persistentToken,
        );
        if (deviceId) {
          const bundle = await this.issueAuthenticatedSession(user, ctx, {
            mfaCompleted: true,
            deviceId,
          });
          return { kind: 'authenticated', bundle };
        }
      }

      if (!user.phone) {
        throw new LoomisError(
          'IDENTITY_SMS_PHONE_REQUIRED',
          422,
          'Your account needs a phone number on file before you can sign in with SMS verification',
        );
      }

      const mfaChallengeId = await this.createMfaChallenge(user.id, ctx, 'sms');
      const delivery = await smsOtpService.sendOtp({
        userId: user.id,
        phoneE164: user.phone,
        purpose: 'login',
      });
      return {
        kind: 'mfa_required',
        mfaChallengeId,
        channel: 'sms',
        maskedPhone: delivery.maskedPhone,
        devBypass: delivery.devBypass,
      };
    }

    if (
      tenantCtx &&
      advancedOptionalTotpLogin(
        role,
        tenantCtx.experienceTier,
        mergeExperienceFlags(tenantCtx.experienceFlags),
      )
    ) {
      const mfaConfig = await mfaRepository.findByUserId(user.id);
      if (mfaConfig?.status === 'active') {
        if (ctx.persistentToken && ctx.deviceFingerprint) {
          const deviceId = await deviceService.verifyPersistentToken(
            user.id,
            ctx.deviceFingerprint,
            ctx.persistentToken,
          );
          if (deviceId) {
            const bundle = await this.issueAuthenticatedSession(user, ctx, {
              mfaCompleted: true,
              deviceId,
            });
            return { kind: 'authenticated', bundle };
          }
        }
        const mfaChallengeId = await this.createMfaChallenge(user.id, ctx, 'totp');
        return { kind: 'mfa_required', mfaChallengeId, channel: 'totp' as const };
      }
    }

    if (role === 'parent') {
      if (ctx.persistentToken && ctx.deviceFingerprint) {
        const deviceId = await deviceService.verifyPersistentToken(
          user.id,
          ctx.deviceFingerprint,
          ctx.persistentToken,
        );
        if (deviceId) {
          const bundle = await this.issueAuthenticatedSession(user, ctx, {
            mfaCompleted: true,
            deviceId,
          });
          return { kind: 'authenticated', bundle };
        }
      }

      if (user.phone) {
        const mfaChallengeId = await this.createMfaChallenge(user.id, ctx, 'sms');
        const delivery = await smsOtpService.sendOtp({
          userId: user.id,
          phoneE164: user.phone,
          purpose: 'parent_new_device',
        });
        return {
          kind: 'mfa_required',
          mfaChallengeId,
          channel: 'sms',
          maskedPhone: delivery.maskedPhone,
          devBypass: delivery.devBypass,
        };
      }
    }

    const bundle = await this.issueAuthenticatedSession(user, ctx, { mfaCompleted: false });
    return { kind: 'authenticated', bundle };
  },

  /** Locks the account once failures cross the threshold within the window (SEC-AUTH-006). */
  async enforceLockoutThreshold(email: string, user: UserRow | null): Promise<void> {
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS);
    const failures = await userRepository.countRecentFailedAttempts(email, windowStart);
    if (failures < LOCKOUT_THRESHOLD) return;

    if (user) {
      await userRepository.setStatus(user.id, 'locked', new Date(Date.now() + LOCKOUT_WINDOW_MS));
    }
    // BLOCKED: SEC-AUTH-006 requires an email notification to the registered
    // address on lockout. AWS SES is not configured (no SES credentials in env),
    // so the email is not sent here. Wire this to the comms module once SES is set up.
  },

  /** Verifies a TOTP challenge from login; on success issues an authenticated session. */
  async verifyMfaChallenge(
    challengeId: string,
    code: string,
    ctx: RequestContext,
  ): Promise<AuthenticatedBundle> {
    const redis = getRedis();
    const key = mfaChallengeKey(challengeId);
    const raw = await redis.get(key);
    if (!raw) {
      throw new LoomisError('IDENTITY_MFA_INVALID', 401, 'MFA challenge expired or not found');
    }
    const challenge = JSON.parse(raw) as MfaChallengePayload;

    const user = await userRepository.findById(challenge.userId);
    if (!user) {
      await redis.del(key);
      throw new LoomisError('IDENTITY_MFA_INVALID', 401, 'MFA challenge expired or not found');
    }

    if (challenge.channel === 'sms') {
      try {
        await smsOtpService.verifyOtp({
          userId: challenge.userId,
          purpose: user.role === 'parent' ? 'parent_new_device' : 'login',
          code,
        });
      } catch (error) {
        challenge.attempts += 1;
        if (challenge.attempts >= MFA_CHALLENGE_MAX_ATTEMPTS) {
          await redis.del(key);
        } else {
          await redis.setex(key, MFA_CHALLENGE_TTL_SECONDS, JSON.stringify(challenge));
        }
        throw error;
      }
    } else {
      const mfaConfig = await mfaRepository.findByUserId(challenge.userId);
      if (!mfaConfig || mfaConfig.status !== 'active') {
        await redis.del(key);
        throw new LoomisError('IDENTITY_MFA_INVALID', 401, 'MFA is not available for this account');
      }

      const valid = mfaService.verifyTotp(mfaConfig.encryptedSecret, code);
      if (!valid) {
        challenge.attempts += 1;
        if (challenge.attempts >= MFA_CHALLENGE_MAX_ATTEMPTS) {
          await redis.del(key);
        } else {
          await redis.setex(key, MFA_CHALLENGE_TTL_SECONDS, JSON.stringify(challenge));
        }
        throw new LoomisError('IDENTITY_MFA_INVALID', 401, 'Invalid MFA code');
      }
    }

    await redis.del(key);

    const issueOptions: IssueOptions = { mfaCompleted: true };
    // First successful MFA from a device registers it (SEC-AUTH-014).
    if (challenge.deviceFingerprint) {
      const reg = await deviceService.registerDevice(
        user.id,
        challenge.deviceFingerprint,
        challenge.platform,
      );
      issueOptions.deviceId = reg.deviceId;
      issueOptions.persistentToken = reg.persistentToken;
      issueOptions.persistentTokenExpiresAt = reg.persistentTokenExpiresAt;
    }

    return this.issueAuthenticatedSession(
      user,
      {
        platform: challenge.platform,
        ...(ctx.ipAddress !== undefined ? { ipAddress: ctx.ipAddress } : {}),
        ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
      },
      issueOptions,
    );
  },

  async createMfaChallenge(
    userId: string,
    ctx: LoginContext,
    channel: 'sms' | 'totp',
  ): Promise<string> {
    const challengeId = uuidv7();
    const payload: MfaChallengePayload = {
      userId,
      platform: ctx.platform,
      deviceFingerprint: ctx.deviceFingerprint ?? null,
      attempts: 0,
      channel,
    };
    await getRedis().setex(mfaChallengeKey(challengeId), MFA_CHALLENGE_TTL_SECONDS, JSON.stringify(payload));
    return challengeId;
  },

  /** Sends an SMS OTP for a high-risk step-up action (Core tier). */
  async sendStepUpSms(
    userId: string,
    action: StepUpAction,
    opts?: { refundAmountMinor?: number },
  ): Promise<{ maskedPhone: string; devBypass: boolean; channel: 'sms' | 'totp' }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'User not found');
    }

    const tenantCtx = await loadTenantMfaContext(user.tenantId);
    const flags = mergeExperienceFlags(tenantCtx?.experienceFlags);
    const tier = tenantCtx?.experienceTier ?? 'core';
    const usesSms = stepUpUsesSms(action, tier, flags, {
      ...(opts?.refundAmountMinor !== undefined
        ? { refundAmountMinor: opts.refundAmountMinor }
        : {}),
    });

    if (!usesSms) {
      return { maskedPhone: '', devBypass: false, channel: 'totp' };
    }

    if (!user.phone) {
      throw new LoomisError(
        'IDENTITY_SMS_PHONE_REQUIRED',
        422,
        'A phone number is required for SMS verification',
      );
    }

    const delivery = await smsOtpService.sendOtp({
      userId,
      phoneE164: user.phone,
      purpose: 'step_up',
      action,
    });
    return { ...delivery, channel: 'sms' };
  },

  /** Creates the session + access token + first refresh token (single shared issuer). */
  async issueAuthenticatedSession(
    user: UserRow,
    ctx: { platform: DevicePlatform; ipAddress?: string; userAgent?: string },
    opts: IssueOptions,
  ): Promise<AuthenticatedBundle> {
    const { session, displacedSessionId } = await sessionService.createSession(user.id, {
      platform: ctx.platform,
      ...(opts.deviceId !== undefined ? { deviceId: opts.deviceId } : {}),
      ...(ctx.ipAddress !== undefined ? { ipAddress: ctx.ipAddress } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    const nowSec = Math.floor(Date.now() / 1000);
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      role: user.role as Role,
      tenantId: user.tenantId,
      sessionId: session.id,
      userVer: user.userVer,
      deviceId: opts.deviceId ?? null,
      ...(user.displayName ? { displayName: user.displayName } : {}),
      ...(opts.mfaCompleted ? { mfaAt: nowSec } : {}),
    };
    const { token: accessToken, expiresAt: accessExpiresAt } =
      await tokenService.signAccessToken(accessPayload);

    const rawRefresh = tokenService.generateRefreshToken();
    const refreshExpiresAt = tokenService.getRefreshTokenExpiresAt();
    await tokenRepository.create({
      userId: user.id,
      sessionId: session.id,
      tokenHash: tokenService.hashRefreshToken(rawRefresh),
      familyId: uuidv7(),
      expiresAt: refreshExpiresAt,
      ...(opts.deviceId !== undefined ? { deviceId: opts.deviceId } : {}),
    });

    const staffExtensionRoles = await loadStaffExtensionRoles(user);

    return {
      accessToken,
      accessExpiresAt,
      refreshToken: rawRefresh,
      refreshExpiresAt,
      role: user.role as Role,
      tenantId: user.tenantId,
      sessionId: session.id,
      deviceId: opts.deviceId ?? null,
      displacedSessionId,
      staffExtensionRoles,
      ...(user.displayName ? { displayName: user.displayName } : {}),
      ...(opts.persistentToken !== undefined ? { persistentToken: opts.persistentToken } : {}),
      ...(opts.persistentTokenExpiresAt !== undefined
        ? { persistentTokenExpiresAt: opts.persistentTokenExpiresAt }
        : {}),
    };
  },

  /**
   * Single-use refresh rotation with token-family binding (System Design §5.2).
   * Replay of a used/revoked token invalidates the whole family and the session.
   */
  async refresh(rawToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
    role: Role;
    tenantId: string | null;
    staffExtensionRoles: Role[];
    mustChangePassword: boolean;
    displayName?: string;
  }> {
    const tokenHash = tokenService.hashRefreshToken(rawToken);
    const record = await tokenRepository.findByHash(tokenHash);
    if (!record) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Refresh token is not recognised');
    }

    const now = new Date();

    // Replay detection: a token used or revoked before must never be accepted again.
    if (record.revoked || record.usedAt) {
      await db.transaction(async (tx) => {
        await tokenRepository.revokeFamily(record.familyId, tx);
        await sessionService.revokeSession(record.sessionId, 'token_replay', tx);
      });
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Refresh token replay detected');
    }

    if (record.expiresAt <= now) {
      throw new LoomisError('IDENTITY_TOKEN_EXPIRED', 401, 'Refresh token has expired');
    }

    const session = await sessionRepository.findById(record.sessionId);
    if (!session || session.revoked || session.absExpiresAt <= now) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Session is no longer active');
    }

    const user = await userRepository.findById(record.userId);
    if (!user || user.status !== 'active') {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Account is not active');
    }

    const platform = (session.platform as DevicePlatform | null) ?? 'web';
    const newRaw = tokenService.generateRefreshToken();

    await db.transaction(async (tx) => {
      await tokenRepository.markUsed(record.id, tx);
      await tokenRepository.revoke(record.id, tx);
      await tokenRepository.create(
        {
          userId: record.userId,
          sessionId: record.sessionId,
          tokenHash: tokenService.hashRefreshToken(newRaw),
          familyId: record.familyId,
          // Preserve the family deadline — rotation never extends absolute lifetime.
          expiresAt: record.expiresAt,
          ...(record.deviceId ? { deviceId: record.deviceId } : {}),
        },
        tx,
      );
      // Refresh resets the idle clock but not the absolute deadline (SEC-AUTH-011).
      await sessionService.slideIdle(session.id, platform, session.absExpiresAt, tx);
    });

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      role: user.role as Role,
      tenantId: user.tenantId,
      sessionId: session.id,
      userVer: user.userVer,
      deviceId: record.deviceId ?? null,
      ...(user.displayName ? { displayName: user.displayName } : {}),
    };
    const { token: accessToken, expiresAt } = await tokenService.signAccessToken(accessPayload);
    const staffExtensionRoles = await loadStaffExtensionRoles(user);

    return {
      accessToken,
      refreshToken: newRaw,
      expiresAt,
      refreshExpiresAt: record.expiresAt,
      role: user.role as Role,
      tenantId: user.tenantId,
      staffExtensionRoles,
      mustChangePassword: user.mustChangePassword,
      ...(user.displayName ? { displayName: user.displayName } : {}),
    };
  },

  /** Logout: revokes the current session (or all), clears device tokens, blacklists the access jti. */
  async logout(params: {
    userId: string;
    sessionId: string;
    accessJti: string;
    accessExpiresAt: Date;
    deviceId?: string | null;
    refreshToken?: string;
    allDevices: boolean;
  }): Promise<void> {
    if (params.allDevices) {
      await db.transaction(async (tx) => {
        await sessionService.revokeAllForUser(params.userId, 'user_logout', undefined, tx);
        await deviceService.deregisterAllForUser(params.userId, tx);
      });
    } else {
      await db.transaction(async (tx) => {
        await sessionService.revokeSession(params.sessionId, 'user_logout', tx);
        if (params.deviceId) {
          // Explicit logout removes that device's persistent token (SEC-AUTH-014).
          await deviceService.clearPersistentTokenForSessionDevice(params.deviceId, tx);
        }
      });
      if (params.refreshToken) {
        const record = await tokenRepository.findByHash(
          tokenService.hashRefreshToken(params.refreshToken),
        );
        if (record) await tokenRepository.revokeFamily(record.familyId);
      }
    }

    await tokenService.blacklistJti(params.accessJti, params.accessExpiresAt);
  },

  /** Issues a step-up proof token after SMS or TOTP verification (SEC-AUTH-008). */
  async stepUp(
    userId: string,
    action: StepUpAction,
    code: string,
    opts?: { refundAmountMinor?: number },
  ): Promise<{ mfaToken: string; expiresAt: Date }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'User not found');
    }

    const tenantCtx = await loadTenantMfaContext(user.tenantId);
    const flags = mergeExperienceFlags(tenantCtx?.experienceFlags);
    const tier = tenantCtx?.experienceTier ?? 'core';
    const usesSms = stepUpUsesSms(action, tier, flags, {
      ...(opts?.refundAmountMinor !== undefined
        ? { refundAmountMinor: opts.refundAmountMinor }
        : {}),
    });

    if (usesSms) {
      await smsOtpService.verifyOtp({
        userId,
        purpose: 'step_up',
        action,
        code,
      });
    } else {
      const mfaConfig = await mfaRepository.findByUserId(userId);
      if (!mfaConfig || mfaConfig.status !== 'active') {
        throw new LoomisError('IDENTITY_MFA_NOT_ENROLLED', 403, 'MFA must be enrolled for step-up');
      }
      if (!mfaService.verifyTotp(mfaConfig.encryptedSecret, code)) {
        throw new LoomisError('IDENTITY_MFA_INVALID', 401, 'Invalid MFA code');
      }
    }

    const { token, expiresAt } = await tokenService.signStepUpToken(userId, action);
    return { mfaToken: token, expiresAt };
  },

  /** Begins MFA enrollment: generates a pending TOTP secret and provisioning URI (System Design §5.3). */
  async startEnrollment(userId: string): Promise<{ provisioningUri: string; secretBase32: string }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new LoomisError('IDENTITY_MFA_NOT_ENROLLED', 401, 'User not found for enrollment');
    }

    const secret = mfaService.generateSecret();
    const encrypted = mfaService.encryptSecret(secret.ascii);

    const existing = await mfaRepository.findByUserId(userId);
    if (existing) {
      await mfaRepository.updateEncryptedSecret(userId, encrypted, 'pending');
    } else {
      await mfaRepository.create({ userId, encryptedSecret: encrypted, status: 'pending' });
    }

    return {
      provisioningUri: mfaService.buildProvisioningUri(secret.base32, user.email),
      secretBase32: secret.base32,
    };
  },

  /** Confirms enrollment with the first TOTP and returns one-time backup codes. */
  async confirmEnrollment(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const mfaConfig = await mfaRepository.findByUserId(userId);
    if (!mfaConfig || mfaConfig.status === 'active') {
      throw new LoomisError('IDENTITY_MFA_NOT_ENROLLED', 400, 'Start MFA enrollment first');
    }
    if (!mfaService.verifyTotp(mfaConfig.encryptedSecret, code)) {
      throw new LoomisError('IDENTITY_MFA_INVALID', 401, 'Invalid MFA code');
    }

    const { plain, hashed } = await mfaService.generateBackupCodes();
    await mfaRepository.activate(userId, hashed);
    return { backupCodes: plain };
  },

  async changePassword(
    userId: string,
    newPassword: string,
    currentPassword?: string,
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new LoomisError('IDENTITY_INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    if (user.mustChangePassword) {
      // Session already proves the user knows the temporary password from login.
    } else if (!currentPassword) {
      throw new LoomisError(
        'VALIDATION_ERROR',
        422,
        'Current password is required to change your password',
      );
    } else {
      const validCurrent = await passwordService.verify(currentPassword, user.passwordHash);
      if (!validCurrent) {
        throw new LoomisError('IDENTITY_INVALID_CREDENTIALS', 401, 'Current password is incorrect');
      }
    }

    const reusingPassword = await passwordService.verify(newPassword, user.passwordHash);
    if (reusingPassword) {
      throw new LoomisError(
        'IDENTITY_PASSWORD_REUSE',
        422,
        'New password must be different from the current password',
      );
    }

    const passwordHash = await passwordService.hash(newPassword);
    const updated = await userRepository.updatePasswordHash(userId, passwordHash);
    if (!updated) {
      throw new LoomisError('INTERNAL_ERROR', 500, 'Failed to update password');
    }
  },

  /** Voluntary TOTP enrollment for Advanced schools with `totpOptional` enabled. */
  async getMfaStatus(userId: string, tenantId: string | null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'User not found');
    }

    const mfaConfig = await mfaRepository.findByUserId(userId);
    const status =
      mfaConfig?.status === 'active'
        ? ('active' as const)
        : mfaConfig?.status === 'pending'
          ? ('pending' as const)
          : ('none' as const);

    const tenantCtx = await loadTenantMfaContext(tenantId);
    const totpOptionalAvailable = Boolean(
      tenantCtx &&
        advancedOptionalTotpLogin(
          user.role as Role,
          tenantCtx.experienceTier,
          mergeExperienceFlags(tenantCtx.experienceFlags),
        ),
    );

    return {
      enrolled: status === 'active',
      status,
      totpOptionalAvailable,
    };
  },

  async startVoluntaryEnrollment(userId: string, tenantId: string | null) {
    const status = await this.getMfaStatus(userId, tenantId);
    if (!status.totpOptionalAvailable) {
      throw new LoomisError(
        'FORBIDDEN',
        403,
        'Authenticator enrollment is not available for your account',
      );
    }
    if (status.enrolled) {
      throw new LoomisError('IDENTITY_MFA_ALREADY_ENROLLED', 409, 'Authenticator is already active');
    }
    return this.startEnrollment(userId);
  },

  async confirmVoluntaryEnrollment(userId: string, tenantId: string | null, code: string) {
    const status = await this.getMfaStatus(userId, tenantId);
    if (!status.totpOptionalAvailable) {
      throw new LoomisError(
        'FORBIDDEN',
        403,
        'Authenticator enrollment is not available for your account',
      );
    }
    return this.confirmEnrollment(userId, code);
  },
};
