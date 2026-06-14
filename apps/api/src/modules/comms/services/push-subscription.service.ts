import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { pushSubscriptionRepository } from '../repository/index.js';
import type { ActorContext, RegisterPushSubscriptionInput } from '../types.js';

export const pushSubscriptionService = {
  async register(input: RegisterPushSubscriptionInput, actor: ActorContext) {
    const provider =
      input.platform === 'android' ? 'fcm' : input.platform === 'ios' ? 'apns' : 'webpush';

    return withTenantContext(input.tenantId ?? null, async (tx) => {
      const ownsDevice = await pushSubscriptionRepository.verifyDeviceOwnership(
        tx,
        actor.userId,
        input.deviceId,
      );
      if (!ownsDevice) {
        throw new LoomisError('FORBIDDEN', 403, 'Device not registered to this user');
      }

      return pushSubscriptionRepository.upsert(tx, {
        userId: actor.userId,
        deviceId: input.deviceId,
        tenantId: input.tenantId ?? actor.tenantId,
        platform: input.platform,
        provider,
        token: input.token,
      });
    });
  },

  async deregister(subscriptionId: string, actor: ActorContext) {
    return withTenantContext(null, async (tx) => {
      const row = await pushSubscriptionRepository.deregister(tx, subscriptionId, actor.userId);
      if (!row) {
        throw new LoomisError('NOT_FOUND', 404, 'Push subscription not found');
      }
      return row;
    });
  },

  async listMine(actor: ActorContext) {
    return pushSubscriptionRepository.listActiveForUserGlobal(actor.userId);
  },
};
