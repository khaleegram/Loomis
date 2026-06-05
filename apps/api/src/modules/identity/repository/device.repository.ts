import { and, eq } from 'drizzle-orm';
import { registeredDevices } from '../../../../drizzle/schema/identity.js';
import { db, type Executor } from '../../../shared/db.js';
import type { CreateDeviceInput } from '../types.js';

export const deviceRepository = {
  async findById(deviceId: string) {
    const [device] = await db
      .select()
      .from(registeredDevices)
      .where(eq(registeredDevices.id, deviceId))
      .limit(1);
    return device ?? null;
  },

  async findByUserAndFingerprint(userId: string, deviceFingerprintHash: string) {
    const [device] = await db
      .select()
      .from(registeredDevices)
      .where(
        and(
          eq(registeredDevices.userId, userId),
          eq(registeredDevices.deviceFingerprintHash, deviceFingerprintHash),
        ),
      )
      .limit(1);
    return device ?? null;
  },

  async listByUserId(userId: string) {
    return db
      .select()
      .from(registeredDevices)
      .where(and(eq(registeredDevices.userId, userId), eq(registeredDevices.revoked, false)));
  },

  async create(input: CreateDeviceInput, tx?: Executor) {
    const executor = tx ?? db;
    const [device] = await executor
      .insert(registeredDevices)
      .values({
        userId: input.userId,
        deviceFingerprintHash: input.deviceFingerprintHash,
        platform: input.platform,
        persistentTokenHash: input.persistentTokenHash ?? null,
        persistentTokenExpiresAt: input.persistentTokenExpiresAt ?? null,
      })
      .returning();
    if (!device) throw new Error('Failed to register device');
    return device;
  },

  async touchLastSeen(deviceId: string, tx?: Executor) {
    const executor = tx ?? db;
    const [device] = await executor
      .update(registeredDevices)
      .set({
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(registeredDevices.id, deviceId))
      .returning();
    return device ?? null;
  },

  async setPersistentToken(
    deviceId: string,
    persistentTokenHash: string,
    persistentTokenExpiresAt: Date,
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const [device] = await executor
      .update(registeredDevices)
      .set({
        persistentTokenHash,
        persistentTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(registeredDevices.id, deviceId))
      .returning();
    return device ?? null;
  },

  async revoke(deviceId: string, tx?: Executor) {
    const executor = tx ?? db;
    const [device] = await executor
      .update(registeredDevices)
      .set({
        revoked: true,
        revokedAt: new Date(),
        persistentTokenHash: null,
        persistentTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(registeredDevices.id, deviceId))
      .returning();
    return device ?? null;
  },

  async revokeAllForUser(userId: string, tx?: Executor) {
    const executor = tx ?? db;
    return executor
      .update(registeredDevices)
      .set({
        revoked: true,
        revokedAt: new Date(),
        persistentTokenHash: null,
        persistentTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(registeredDevices.userId, userId), eq(registeredDevices.revoked, false)))
      .returning();
  },
};
