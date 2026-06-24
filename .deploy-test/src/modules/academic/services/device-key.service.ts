import { createPublicKey } from 'node:crypto';
import type { RegisterDeviceKeyRequest } from '@loomis/contracts';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { deviceKeyRepository } from '../repository/device-key.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant } from './_shared.js';

/** Validates that the supplied PEM is a usable EC public key. */
function assertValidPublicKey(publicKeyPem: string): void {
  try {
    const key = createPublicKey({ key: publicKeyPem, format: 'pem', type: 'spki' });
    if (key.asymmetricKeyType !== 'ec') {
      throw new Error('not an EC key');
    }
  } catch {
    throw new LoomisError(
      'VALIDATION_ERROR',
      422,
      'publicKeyPem must be a valid SPKI PEM-encoded ECDSA public key',
    );
  }
}

/**
 * Per-tenant device signing keys (MOB-007). A device registers its ECDSA P-256
 * public key so the server can verify offline attendance signatures at sync.
 */
export const deviceKeyService = {
  async registerDeviceKey(
    tenantId: string,
    input: RegisterDeviceKeyRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    assertValidPublicKey(input.publicKeyPem);

    const existing = await deviceKeyRepository.findActiveByDeviceId(tenantId, input.deviceId);
    if (existing) {
      throw new LoomisError(
        'ACADEMIC_DEVICE_KEY_CONFLICT',
        409,
        'This device already has an active signing key; revoke it before registering a new one',
      );
    }

    let row;
    try {
      row = await deviceKeyRepository.create(tenantId, {
        deviceId: input.deviceId,
        publicKeyPem: input.publicKeyPem,
        label: input.label ?? null,
        registeredByUserId: actor.userId,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new LoomisError(
          'ACADEMIC_DEVICE_KEY_CONFLICT',
          409,
          'This device already has an active signing key',
        );
      }
      throw err;
    }

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.attendance.device_key_registered',
      resourceType: 'attendance_device_key',
      resourceId: row.id,
      sensitivity: 'security',
      result: 'success',
      requestId,
      metadata: { deviceId: input.deviceId },
    });

    return row;
  },

  async listDeviceKeys(tenantId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    return deviceKeyRepository.list(tenantId);
  },

  async revokeDeviceKey(
    tenantId: string,
    deviceId: string,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    const revoked = await deviceKeyRepository.revoke(tenantId, deviceId);
    if (!revoked) {
      throw new LoomisError(
        'ACADEMIC_ATTENDANCE_DEVICE_KEY_NOT_FOUND',
        404,
        'No active signing key is registered for this device',
      );
    }

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.attendance.device_key_revoked',
      resourceType: 'attendance_device_key',
      resourceId: revoked.id,
      sensitivity: 'security',
      result: 'success',
      requestId,
      metadata: { deviceId },
    });

    return revoked;
  },
};

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505'
  );
}
