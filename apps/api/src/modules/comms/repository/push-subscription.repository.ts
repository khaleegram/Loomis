import { and, eq } from 'drizzle-orm';
import { pushSubscriptions } from '../../../../drizzle/schema/comms.js';
import { registeredDevices } from '../../../../drizzle/schema/identity.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const pushSubscriptionRepository = {
  async upsert(
    tx: Executor,
    input: {
      userId: string;
      deviceId: string;
      tenantId?: string | null;
      platform: 'android' | 'ios' | 'web';
      provider: 'fcm' | 'apns' | 'webpush';
      token: string;
    },
  ) {
    const [row] = await tx
      .insert(pushSubscriptions)
      .values({
        userId: input.userId,
        deviceId: input.deviceId,
        tenantId: input.tenantId ?? null,
        platform: input.platform,
        provider: input.provider,
        token: input.token,
        active: true,
        lastUsedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [pushSubscriptions.userId, pushSubscriptions.deviceId],
        set: {
          token: input.token,
          platform: input.platform,
          provider: input.provider,
          tenantId: input.tenantId ?? null,
          active: true,
          deregisteredAt: null,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!row) throw new Error('Failed to upsert push subscription');
    return row;
  },

  async listActiveForUser(tx: Executor, userId: string) {
    return tx
      .select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.active, true)));
  },

  async deregister(tx: Executor, subscriptionId: string, userId: string) {
    const [row] = await tx
      .update(pushSubscriptions)
      .set({ active: false, deregisteredAt: new Date(), updatedAt: new Date() })
      .where(and(eq(pushSubscriptions.id, subscriptionId), eq(pushSubscriptions.userId, userId)))
      .returning();
    return row ?? null;
  },

  async deregisterByToken(tx: Executor, token: string) {
    return tx
      .update(pushSubscriptions)
      .set({ active: false, deregisteredAt: new Date(), updatedAt: new Date() })
      .where(eq(pushSubscriptions.token, token))
      .returning();
  },

  async verifyDeviceOwnership(tx: Executor, userId: string, deviceId: string): Promise<boolean> {
    const [row] = await tx
      .select({ id: registeredDevices.id })
      .from(registeredDevices)
      .where(and(eq(registeredDevices.id, deviceId), eq(registeredDevices.userId, userId)))
      .limit(1);
    return Boolean(row);
  },

  async listActiveForUserGlobal(userId: string) {
    return withTenantContext(null, async (tx) => this.listActiveForUser(tx, userId));
  },
};
