import { db } from '../../../shared/db.js';
import { userRepository } from '../repository/user.repository.js';
import { deviceService } from './device.service.js';
import { sessionService } from './session.service.js';
import { tokenService } from './token.service.js';

/**
 * Centralises session/token invalidation triggered by security events
 * (SEC-AUTH-012/013). Called by Identity event consumers when HRM publishes
 * staff.role.changed or staff.deactivated.
 */
export const securityInvalidationService = {
  /** Role change → bump user_ver and revoke all sessions/devices (SEC-AUTH-013). */
  async invalidateOnRoleChange(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const user = await userRepository.incrementUserVer(userId, tx);
      if (!user) return;

      await tokenService.setUserVerCache(userId, user.userVer);
      await sessionService.revokeAllForUser(userId, 'role_change', undefined, tx);
      await deviceService.deregisterAllForUser(userId, tx);
    });
  },

  /** Deactivation → mark inactive, bump user_ver, revoke all sessions/devices. */
  async invalidateOnDeactivation(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await userRepository.setStatus(userId, 'deactivated', null, tx);
      const user = await userRepository.incrementUserVer(userId, tx);
      if (!user) return;

      await tokenService.setUserVerCache(userId, user.userVer);
      await sessionService.revokeAllForUser(userId, 'deactivation', undefined, tx);
      await deviceService.deregisterAllForUser(userId, tx);
    });
  },
};
