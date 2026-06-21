import type { Role } from '@loomis/contracts';

/**
 * Returns true when the actor's role alone satisfies every required approver role
 * (tier plan §6 — same-account collapse for Owner=Principal workflows).
 */
export function shouldCollapseApproval(
  actorRole: Role,
  requiredApproverRoles: readonly Role[],
): boolean {
  if (requiredApproverRoles.length === 0) return true;
  return requiredApproverRoles.every((required) => required === actorRole);
}
