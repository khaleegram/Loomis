import type { Role } from '@loomis/contracts';
import { canActAsClassTeacher, canTeachSubjects } from '@loomis/core';

import { resolveStaffEffectiveRoles } from '../../hrm/services/staff-role-resolver.js';
import type { ActorContext } from '../types.js';

export async function actorEffectiveRoles(actor: ActorContext): Promise<Role[]> {
  if (!actor.tenantId) {
    return [actor.role as Role];
  }
  return resolveStaffEffectiveRoles(actor.tenantId, actor.userId, actor.role as Role);
}

export async function actorCanTeachSubjects(actor: ActorContext): Promise<boolean> {
  return canTeachSubjects(await actorEffectiveRoles(actor));
}

export async function actorCanActAsClassTeacher(actor: ActorContext): Promise<boolean> {
  return canActAsClassTeacher(await actorEffectiveRoles(actor));
}
