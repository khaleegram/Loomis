import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getEnv } from '../../../config/env.js';
import type { Executor } from '../../../shared/db.js';
import { LoomisError } from '../../../shared/errors.js';
import { deviceRepository } from '../repository/device.repository.js';
import type { DevicePlatform } from '../types.js';

const PERSISTENT_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Domain-separation prefix so the persistent-token HMAC can never collide with refresh tokens. */
const PERSISTENT_TOKEN_DOMAIN = 'persistent-device:';

function fingerprintHash(deviceFingerprint: string): string {
  return createHash('sha256').update(deviceFingerprint).digest('hex');
}

function persistentTokenHash(rawToken: string): string {
  const env = getEnv();
  return createHmac('sha256', env.REFRESH_TOKEN_HMAC_SECRET)
    .update(PERSISTENT_TOKEN_DOMAIN + rawToken)
    .digest('hex');
}

export interface RegisterDeviceResult {
  deviceId: string;
  /** Raw persistent token — returned exactly once, stored only as an HMAC hash. */
  persistentToken: string;
  persistentTokenExpiresAt: Date;
}

export const deviceService = {
  /**
   * Registers (or refreshes) a device after the first successful MFA from it and
   * mints a 30-day persistent token (SEC-AUTH-014, System Design §5.5). The raw
   * token is returned once for the client keychain; only its HMAC hash is stored.
   */
  async registerDevice(
    userId: string,
    deviceFingerprint: string,
    platform: DevicePlatform,
    tx?: Executor,
  ): Promise<RegisterDeviceResult> {
    const fpHash = fingerprintHash(deviceFingerprint);
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = persistentTokenHash(rawToken);
    const expiresAt = new Date(Date.now() + PERSISTENT_TOKEN_TTL_MS);

    const existing = await deviceRepository.findByUserAndFingerprint(userId, fpHash);
    let deviceId: string;
    if (existing) {
      await deviceRepository.setPersistentToken(existing.id, tokenHash, expiresAt, tx);
      await deviceRepository.touchLastSeen(existing.id, tx);
      deviceId = existing.id;
    } else {
      const device = await deviceRepository.create(
        {
          userId,
          deviceFingerprintHash: fpHash,
          platform,
          persistentTokenHash: tokenHash,
          persistentTokenExpiresAt: expiresAt,
        },
        tx,
      );
      deviceId = device.id;
    }

    return { deviceId, persistentToken: rawToken, persistentTokenExpiresAt: expiresAt };
  },

  /**
   * Verifies a presented persistent token for reduced MFA friction on a known
   * device. Returns the device id when valid, else null. Constant-time compare.
   */
  async verifyPersistentToken(
    userId: string,
    deviceFingerprint: string,
    rawToken: string,
  ): Promise<string | null> {
    const device = await deviceRepository.findByUserAndFingerprint(
      userId,
      fingerprintHash(deviceFingerprint),
    );
    if (
      !device ||
      device.revoked ||
      !device.persistentTokenHash ||
      !device.persistentTokenExpiresAt ||
      device.persistentTokenExpiresAt <= new Date()
    ) {
      return null;
    }

    const expected = Buffer.from(device.persistentTokenHash, 'hex');
    const actual = Buffer.from(persistentTokenHash(rawToken), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }

    await deviceRepository.touchLastSeen(device.id);
    return device.id;
  },

  /**
   * Deregisters a single device: revokes it and clears its persistent token,
   * forcing full MFA on the next login from that device (SEC-AUTH-014).
   */
  async deregisterDevice(deviceId: string, tx?: Executor) {
    return deviceRepository.revoke(deviceId, tx);
  },

  /** Clears a device's persistent token on explicit logout (SEC-AUTH-014). */
  async clearPersistentTokenForSessionDevice(deviceId: string, tx?: Executor) {
    return deviceRepository.revoke(deviceId, tx);
  },

  /**
   * Deregisters every device for a user — used on MFA reset/removal so all
   * persistent device tokens are invalidated (SEC-AUTH-014, SEC-AUTH-015).
   */
  async deregisterAllForUser(userId: string, tx?: Executor) {
    return deviceRepository.revokeAllForUser(userId, tx);
  },

  /** Lists registered devices for the security settings page (US-HRM-008). */
  async listDevicesForUser(userId: string) {
    const devices = await deviceRepository.listByUserId(userId);
    return devices.map((device) => ({
      id: device.id,
      platform: device.platform as DevicePlatform,
      registeredAt: device.registeredAt.toISOString(),
      lastSeenAt: device.lastSeenAt.toISOString(),
      hasPersistentToken:
        device.persistentTokenHash !== null &&
        device.persistentTokenExpiresAt !== null &&
        device.persistentTokenExpiresAt > new Date(),
      persistentTokenExpiresAt: device.persistentTokenExpiresAt?.toISOString() ?? null,
    }));
  },

  /** User-initiated deregistration from security settings (US-HRM-008). */
  async deregisterDeviceForUser(userId: string, deviceId: string) {
    const device = await deviceRepository.findById(deviceId);
    if (!device || device.userId !== userId || device.revoked) {
      throw new LoomisError('NOT_FOUND', 404, 'Device not found');
    }
    const revoked = await this.deregisterDevice(deviceId);
    if (!revoked) {
      throw new LoomisError('NOT_FOUND', 404, 'Device not found');
    }
    return revoked;
  },
};
