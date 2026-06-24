import { and, eq, inArray } from 'drizzle-orm';
import { users } from '../../../../drizzle/schema/identity.js';
import type { Executor } from '../../../shared/db.js';

export const platformUserRepository = {
  async findUserIdsByRoles(tx: Executor, roles: string[]): Promise<string[]> {
    const rows = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.role, roles), eq(users.status, 'active')));
    return rows.map((r) => r.id);
  },

  async findDpoUserIds(tx: Executor): Promise<string[]> {
    return this.findUserIdsByRoles(tx, ['dpo']);
  },

  async findPlatformOwnerUserIds(tx: Executor): Promise<string[]> {
    return this.findUserIdsByRoles(tx, ['platform_owner']);
  },
};
