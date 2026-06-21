import { z } from 'zod';

/** School role-experience tier (ROLE_EXPERIENCE_TIER_PLAN.md). Not the platform pricing tier. */
export const experienceTier = z.enum(['core', 'advanced', 'enterprise']);
export type ExperienceTier = z.infer<typeof experienceTier>;

/** Combined finance officer vs split cashier / accountant. */
export const financeMode = z.enum(['combined', 'split']);
export type FinanceMode = z.infer<typeof financeMode>;

/** Per-tenant Advanced feature toggles (Owner self-service from Sprint 8). */
export const tenantExperienceFlags = z.object({
  workflowsInbox: z.boolean().optional(),
  timetableDedicatedOfficer: z.boolean().optional(),
  deputyExamEnabled: z.boolean().optional(),
  totpOptional: z.boolean().optional(),
  /** Core refund: force single approver regardless of amount (tier plan §5). */
  coreRefundSingleApprover: z.enum(['principal', 'owner']).optional(),
});
export type TenantExperienceFlags = z.infer<typeof tenantExperienceFlags>;

export const tenantExperienceResponse = z.object({
  tenantId: z.string().uuid(),
  experienceTier: experienceTier,
  financeMode: financeMode,
  flags: tenantExperienceFlags,
});
export type TenantExperienceResponse = z.infer<typeof tenantExperienceResponse>;

/** Platform ops — set tier / finance mode (Enterprise activation). Owner flag updates in Sprint 8. */
export const updateTenantExperienceRequest = z
  .object({
    experienceTier: experienceTier.optional(),
    financeMode: financeMode.optional(),
    flags: tenantExperienceFlags.optional(),
  })
  .refine(
    (body) =>
      body.experienceTier !== undefined ||
      body.financeMode !== undefined ||
      body.flags !== undefined,
    { message: 'At least one field must be provided' },
  );
export type UpdateTenantExperienceRequest = z.infer<typeof updateTenantExperienceRequest>;
