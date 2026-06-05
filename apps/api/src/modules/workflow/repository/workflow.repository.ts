import { and, asc, eq, inArray, isNotNull, isNull, lte } from 'drizzle-orm';
import type { ApproverChainStep as ContractApproverChainStep } from '@loomis/contracts';
import type { ApproverChainStep } from '../../../../drizzle/schema/workflow.js';
import {
  workflowDecisions,
  workflowInstances,
  workflowSteps,
  workflowTemplates,
} from '../../../../drizzle/schema/workflow.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { WORKFLOW_EVENT_TYPES, type WorkflowCompletedEvent } from '../events/types.js';
import type { ResolvedTemplate } from '../types.js';
import { workflowOutboxRepository } from './outbox.repository.js';

type WorkflowInstanceRow = typeof workflowInstances.$inferSelect;
type WorkflowStepRow = typeof workflowSteps.$inferSelect;
type WorkflowDecisionRow = typeof workflowDecisions.$inferSelect;

export interface CreateWorkflowBundle {
  instance: WorkflowInstanceRow;
  steps: WorkflowStepRow[];
}

function normalizeChain(chain: ContractApproverChainStep[]): ApproverChainStep[] {
  return chain.map((step) => ({
    role: step.role,
    timeoutHours: step.timeoutHours ?? null,
    escalatesToRole: step.escalatesToRole ?? null,
  }));
}

function computeDueAt(activatedAt: Date, timeoutHours: number | null | undefined): Date | null {
  if (!timeoutHours || timeoutHours <= 0) return null;
  return new Date(activatedAt.getTime() + timeoutHours * 60 * 60 * 1000);
}

export const workflowRepository = {
  async findTemplate(
    tenantId: string | null,
    workflowType: string,
  ): Promise<typeof workflowTemplates.$inferSelect | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(workflowTemplates)
        .where(
          and(
            eq(workflowTemplates.workflowType, workflowType),
            tenantId === null ? isNull(workflowTemplates.tenantId) : eq(workflowTemplates.tenantId, tenantId),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async upsertTemplate(
    tenantId: string | null,
    workflowType: string,
    approverChain: ContractApproverChainStep[],
    isMandatory: boolean,
    isActive: boolean,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const existing = await tx
        .select()
        .from(workflowTemplates)
        .where(
          and(
            eq(workflowTemplates.workflowType, workflowType),
            tenantId === null ? isNull(workflowTemplates.tenantId) : eq(workflowTemplates.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        const [row] = await tx
          .update(workflowTemplates)
          .set({
            approverChain: normalizeChain(approverChain),
            isActive,
            updatedAt: new Date(),
          })
          .where(eq(workflowTemplates.id, existing[0].id))
          .returning();
        if (!row) throw new Error('Failed to update workflow template');
        return row;
      }

      const [row] = await tx
        .insert(workflowTemplates)
        .values({
          tenantId,
          workflowType,
          approverChain: normalizeChain(approverChain),
          isMandatory,
          isActive,
        })
        .returning();
      if (!row) throw new Error('Failed to create workflow template');
      return row;
    });
  },

  async listTemplates(tenantId: string | null) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(workflowTemplates)
        .where(
          tenantId === null ? isNull(workflowTemplates.tenantId) : eq(workflowTemplates.tenantId, tenantId),
        )
        .orderBy(asc(workflowTemplates.workflowType)),
    );
  },

  async createInstanceWithSteps(
    tenantId: string | null,
    template: ResolvedTemplate,
    input: {
      requestedById: string;
      requestedByRole: string;
      subjectType?: string | null;
      subjectId?: string | null;
      title?: string | null;
      payload: Record<string, unknown>;
    },
  ): Promise<CreateWorkflowBundle> {
    return withTenantContext(tenantId, async (tx) => {
      const [instance] = await tx
        .insert(workflowInstances)
        .values({
          tenantId,
          workflowType: template.workflowType,
          status: 'pending',
          requestedById: input.requestedById,
          requestedByRole: input.requestedByRole,
          subjectType: input.subjectType ?? null,
          subjectId: input.subjectId ?? null,
          title: input.title ?? null,
          payload: input.payload,
          currentStepSequence: 1,
        })
        .returning();
      if (!instance) throw new Error('Failed to create workflow instance');

      const now = new Date();
      const stepRows: WorkflowStepRow[] = [];
      for (let i = 0; i < template.approverChain.length; i++) {
        const chainStep = template.approverChain[i]!;
        const isFirst = i === 0;
        const activatedAt = isFirst ? now : null;
        const [step] = await tx
          .insert(workflowSteps)
          .values({
            tenantId,
            workflowInstanceId: instance.id,
            sequence: i + 1,
            approverRole: chainStep.role,
            status: isFirst ? 'active' : 'pending',
            timeoutHours: chainStep.timeoutHours ?? null,
            escalatesToRole: chainStep.escalatesToRole ?? null,
            dueAt: isFirst ? computeDueAt(now, chainStep.timeoutHours) : null,
            activatedAt,
          })
          .returning();
        if (!step) throw new Error('Failed to create workflow step');
        stepRows.push(step);
      }

      return { instance, steps: stepRows };
    });
  },

  async findInstanceById(tenantId: string | null, instanceId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [instance] = await tx
        .select()
        .from(workflowInstances)
        .where(eq(workflowInstances.id, instanceId))
        .limit(1);
      return instance ?? null;
    });
  },

  async listStepsForInstance(tenantId: string | null, instanceId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowInstanceId, instanceId))
        .orderBy(asc(workflowSteps.sequence)),
    );
  },

  async listDecisionsForInstance(tenantId: string | null, instanceId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(workflowDecisions)
        .where(eq(workflowDecisions.workflowInstanceId, instanceId))
        .orderBy(asc(workflowDecisions.createdAt)),
    );
  },

  async findActiveStep(tenantId: string | null, instanceId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [step] = await tx
        .select()
        .from(workflowSteps)
        .where(
          and(
            eq(workflowSteps.workflowInstanceId, instanceId),
            eq(workflowSteps.status, 'active'),
          ),
        )
        .limit(1);
      return step ?? null;
    });
  },

  async listInboxForRole(tenantId: string | null, approverRole: string) {
    return withTenantContext(tenantId, async (tx) => {
      const activeSteps = await tx
        .select()
        .from(workflowSteps)
        .where(
          and(
            eq(workflowSteps.approverRole, approverRole),
            eq(workflowSteps.status, 'active'),
          ),
        )
        .orderBy(asc(workflowSteps.dueAt));

      if (activeSteps.length === 0) return [];

      const instanceIds = activeSteps.map((s) => s.workflowInstanceId);
      const instances = await tx
        .select()
        .from(workflowInstances)
        .where(
          and(
            inArray(workflowInstances.id, instanceIds),
            eq(workflowInstances.status, 'pending'),
          ),
        );

      const instanceMap = new Map(instances.map((i) => [i.id, i]));
      return activeSteps
        .map((step) => {
          const instance = instanceMap.get(step.workflowInstanceId);
          if (!instance) return null;
          return { instance, activeStep: step };
        })
        .filter((row): row is { instance: WorkflowInstanceRow; activeStep: WorkflowStepRow } =>
          row !== null,
        );
    });
  },

  async listByRequester(tenantId: string | null, requesterId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(workflowInstances)
        .where(eq(workflowInstances.requestedById, requesterId))
        .orderBy(asc(workflowInstances.createdAt)),
    );
  },

  async recordDecisionAndAdvance(
    tenantId: string | null,
    params: {
      instance: WorkflowInstanceRow;
      step: WorkflowStepRow;
      actorUserId: string;
      actorRole: string;
      decision: 'approve' | 'reject' | 'return';
      comment?: string | null;
      completedEvent?: WorkflowCompletedEvent;
    },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();

      const [decisionRow] = await tx
        .insert(workflowDecisions)
        .values({
          tenantId,
          workflowInstanceId: params.instance.id,
          workflowStepId: params.step.id,
          actorUserId: params.actorUserId,
          actorRole: params.actorRole,
          decision: params.decision,
          comment: params.comment ?? null,
        })
        .returning();
      if (!decisionRow) throw new Error('Failed to record workflow decision');

      if (params.decision === 'reject' || params.decision === 'return') {
        const terminalStatus = params.decision === 'reject' ? 'rejected' : 'returned';
        await tx
          .update(workflowSteps)
          .set({ status: terminalStatus, completedAt: now, updatedAt: now })
          .where(eq(workflowSteps.id, params.step.id));

        const [closed] = await tx
          .update(workflowInstances)
          .set({
            status: terminalStatus,
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(workflowInstances.id, params.instance.id))
          .returning();
        if (!closed) throw new Error('Failed to close workflow instance');

        if (params.completedEvent) {
          await workflowOutboxRepository.append(tx, {
            aggregateType: 'workflow_instance',
            aggregateId: params.instance.id,
            eventType: WORKFLOW_EVENT_TYPES.completed,
            tenantId,
            payload: params.completedEvent as unknown as Record<string, unknown>,
          });
        }

        return { instance: closed, decision: decisionRow, advanced: false };
      }

      // Approve: mark step approved, advance or complete.
      await tx
        .update(workflowSteps)
        .set({ status: 'approved', completedAt: now, updatedAt: now })
        .where(eq(workflowSteps.id, params.step.id));

      const allSteps = await tx
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowInstanceId, params.instance.id))
        .orderBy(asc(workflowSteps.sequence));

      const nextStep = allSteps.find(
        (s) => s.sequence > params.step.sequence && s.status === 'pending',
      );

      if (!nextStep) {
        const [closed] = await tx
          .update(workflowInstances)
          .set({
            status: 'approved',
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(workflowInstances.id, params.instance.id))
          .returning();
        if (!closed) throw new Error('Failed to approve workflow instance');

        if (params.completedEvent) {
          await workflowOutboxRepository.append(tx, {
            aggregateType: 'workflow_instance',
            aggregateId: params.instance.id,
            eventType: WORKFLOW_EVENT_TYPES.completed,
            tenantId,
            payload: params.completedEvent as unknown as Record<string, unknown>,
          });
        }

        return { instance: closed, decision: decisionRow, advanced: false };
      }

      const activatedAt = now;
      const [activated] = await tx
        .update(workflowSteps)
        .set({
          status: 'active',
          activatedAt,
          dueAt: computeDueAt(activatedAt, nextStep.timeoutHours),
          updatedAt: now,
        })
        .where(eq(workflowSteps.id, nextStep.id))
        .returning();
      if (!activated) throw new Error('Failed to activate next workflow step');

      const [updated] = await tx
        .update(workflowInstances)
        .set({
          currentStepSequence: activated.sequence,
          updatedAt: now,
        })
        .where(eq(workflowInstances.id, params.instance.id))
        .returning();
      if (!updated) throw new Error('Failed to update workflow instance');

      return { instance: updated, decision: decisionRow, advanced: true, activeStep: activated };
    });
  },

  async listOverdueActiveSteps(before: Date) {
    // Cross-tenant scan for the escalation job — uses null tenant context.
    return withTenantContext(null, async (tx) =>
      tx
        .select({
          step: workflowSteps,
          instance: workflowInstances,
        })
        .from(workflowSteps)
        .innerJoin(workflowInstances, eq(workflowSteps.workflowInstanceId, workflowInstances.id))
        .where(
          and(
            eq(workflowSteps.status, 'active'),
            eq(workflowInstances.status, 'pending'),
            isNotNull(workflowSteps.dueAt),
            lte(workflowSteps.dueAt, before),
            isNotNull(workflowSteps.escalatesToRole),
          ),
        ),
    );
  },

  async escalateStep(
    tenantId: string | null,
    params: {
      step: WorkflowStepRow;
      instance: WorkflowInstanceRow;
      escalatedEvent: Record<string, unknown>;
    },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const newRole = params.step.escalatesToRole;
      if (!newRole) throw new Error('Step has no escalation role');

      const [escalated] = await tx
        .update(workflowSteps)
        .set({
          approverRole: newRole,
          escalatedAt: now,
          dueAt: computeDueAt(now, params.step.timeoutHours),
          updatedAt: now,
        })
        .where(eq(workflowSteps.id, params.step.id))
        .returning();
      if (!escalated) throw new Error('Failed to escalate workflow step');

      await workflowOutboxRepository.append(tx, {
        aggregateType: 'workflow_instance',
        aggregateId: params.instance.id,
        eventType: WORKFLOW_EVENT_TYPES.escalated,
        tenantId,
        payload: params.escalatedEvent,
      });

      return escalated;
    });
  },
};

export type {
  WorkflowInstanceRow,
  WorkflowStepRow,
  WorkflowDecisionRow,
};
