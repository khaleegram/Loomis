import { uuidv7 } from 'uuidv7';
import {
  DEFAULT_WORKFLOW_CHAINS,
  type ApproverChainStep,
  type WorkflowType,
} from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { dispatchEvent } from '../../../shared/events/registry.js';
import {
  WORKFLOW_EVENT_TYPES,
  type WorkflowCompletedEvent,
  type WorkflowEscalatedEvent,
} from '../events/types.js';
import { workflowRepository } from '../repository/workflow.repository.js';
import type {
  ActorContext,
  DecideInput,
  ResolvedTemplate,
  StartWorkflowInput,
  UpsertTemplateInput,
} from '../types.js';

function tenantContextFor(tenantId: string | null): string | null {
  return tenantId;
}

async function resolveTemplate(
  workflowType: WorkflowType,
  tenantId: string | null,
): Promise<ResolvedTemplate> {
  const defaults = DEFAULT_WORKFLOW_CHAINS[workflowType];
  if (!defaults) {
    throw new LoomisError('VALIDATION_ERROR', 422, `Unknown workflow type: ${workflowType}`);
  }

  if (tenantId) {
    const tenantTemplate = await workflowRepository.findTemplate(tenantId, workflowType);
    if (tenantTemplate?.isActive) {
      return {
        workflowType,
        approverChain: tenantTemplate.approverChain as ApproverChainStep[],
        isMandatory: tenantTemplate.isMandatory,
      };
    }
  }

  const scopeTenantId = defaults.scope === 'platform' ? null : tenantId;
  const platformTemplate = await workflowRepository.findTemplate(scopeTenantId, workflowType);
  if (platformTemplate?.isActive) {
    return {
      workflowType,
      approverChain: platformTemplate.approverChain as ApproverChainStep[],
      isMandatory: platformTemplate.isMandatory,
    };
  }

  return {
    workflowType,
    approverChain: defaults.chain,
    isMandatory: defaults.isMandatory,
  };
}

function assertCanView(instance: { requestedById: string }, actor: ActorContext, steps: { approverRole: string }[], decisions: { actorUserId: string }[]) {
  const participated =
    instance.requestedById === actor.userId ||
    decisions.some((d) => d.actorUserId === actor.userId) ||
    steps.some((s) => s.approverRole === actor.role);
  if (!participated) {
    throw new LoomisError('WORKFLOW_FORBIDDEN', 403, 'You do not have access to this workflow');
  }
}

function buildCompletedEvent(
  instance: {
    id: string;
    workflowType: string;
    tenantId: string | null;
    requestedById: string;
    subjectType: string | null;
    subjectId: string | null;
    payload: Record<string, unknown>;
    status: string;
  },
  approvedById: string | null,
): WorkflowCompletedEvent {
  return {
    eventId: uuidv7(),
    workflowInstanceId: instance.id,
    workflowType: instance.workflowType as WorkflowType,
    tenantId: instance.tenantId,
    status: instance.status as WorkflowCompletedEvent['status'],
    requestedById: instance.requestedById,
    approvedById,
    subjectType: instance.subjectType,
    subjectId: instance.subjectId,
    payload: instance.payload,
    occurredAt: new Date().toISOString(),
  };
}

/**
 * Public Workflow API — other modules call `startWorkflow` / `decide` synchronously
 * for reads and workflow initiation; completion side effects are delivered via
 * `workflow.completed` / `workflow.escalated` outbox events (FR-WFL-003).
 */
export const workflowService = {
  /**
   * Starts a new approval workflow with the resolved approver chain.
   * Returns the instance id and pending status for the caller to store.
   */
  async startWorkflow(input: StartWorkflowInput) {
    const template = await resolveTemplate(input.workflowType, input.tenantId);
    const bundle = await workflowRepository.createInstanceWithSteps(
      tenantContextFor(input.tenantId),
      template,
      {
        requestedById: input.requestedById,
        requestedByRole: input.requestedByRole,
        subjectType: input.subjectType ?? null,
        subjectId: input.subjectId ?? null,
        title: input.title ?? null,
        payload: input.payload ?? {},
      },
    );

    return {
      workflowInstanceId: bundle.instance.id,
      status: bundle.instance.status as 'pending',
      workflowType: bundle.instance.workflowType,
      currentStepSequence: bundle.instance.currentStepSequence,
    };
  },

  /**
   * Convenience wrapper for privileged platform changes (FR-WFL-004 / CON-013).
   */
  async startPrivilegedChange(params: {
    workflowType: WorkflowType;
    tenantId: string | null;
    requestedById: string;
    requestedByRole: string;
    justification: string;
    payload: Record<string, unknown>;
    subjectType?: string | null;
    subjectId?: string | null;
  }) {
    return this.startWorkflow({
      workflowType: params.workflowType,
      tenantId: params.tenantId,
      requestedById: params.requestedById,
      requestedByRole: params.requestedByRole,
      subjectType: params.subjectType ?? null,
      subjectId: params.subjectId ?? null,
      title: params.justification,
      payload: { ...params.payload, justification: params.justification },
    });
  },

  async decide(
    tenantId: string | null,
    instanceId: string,
    stepId: string,
    input: DecideInput,
    actor: ActorContext,
  ) {
    const ctx = tenantContextFor(tenantId);
    const instance = await workflowRepository.findInstanceById(ctx, instanceId);
    if (!instance) {
      throw new LoomisError('WORKFLOW_NOT_FOUND', 404, 'Workflow instance not found');
    }
    if (instance.status !== 'pending') {
      throw new LoomisError(
        'WORKFLOW_ALREADY_TERMINAL',
        409,
        'This workflow has already been completed',
      );
    }

    const activeStep = await workflowRepository.findActiveStep(ctx, instanceId);
    if (!activeStep || activeStep.id !== stepId) {
      throw new LoomisError('WORKFLOW_STEP_NOT_ACTIVE', 409, 'This approval step is not active');
    }

    if (actor.role !== activeStep.approverRole) {
      throw new LoomisError('FORBIDDEN', 403, 'Your role is not authorised for this approval step');
    }

    // CON-013 / FR-WFL-004: requester cannot approve their own request.
    if (instance.requestedById === actor.userId) {
      throw new LoomisError(
        'WORKFLOW_APPROVER_IS_REQUESTER',
        403,
        'The requester cannot approve their own workflow request',
      );
    }

    const terminalOnDecision = input.decision === 'reject' || input.decision === 'return';
    const willComplete =
      input.decision === 'approve' &&
      activeStep.sequence ===
        (await workflowRepository.listStepsForInstance(ctx, instanceId)).length;

    const completedEvent =
      terminalOnDecision || willComplete
        ? buildCompletedEvent(
            {
              ...instance,
              status:
                input.decision === 'approve'
                  ? 'approved'
                  : input.decision === 'reject'
                    ? 'rejected'
                    : 'returned',
            },
            input.decision === 'approve' ? actor.userId : null,
          )
        : undefined;

    const result = await workflowRepository.recordDecisionAndAdvance(ctx, {
      instance,
      step: activeStep,
      actorUserId: actor.userId,
      actorRole: actor.role,
      decision: input.decision,
      comment: input.comment ?? null,
      ...(completedEvent ? { completedEvent } : {}),
    });

    if (completedEvent) {
      await dispatchEvent(WORKFLOW_EVENT_TYPES.completed, completedEvent);
    }

    return result.instance;
  },

  async getInstance(tenantId: string | null, instanceId: string, actor: ActorContext) {
    const ctx = tenantContextFor(tenantId);
    const instance = await workflowRepository.findInstanceById(ctx, instanceId);
    if (!instance) {
      throw new LoomisError('WORKFLOW_NOT_FOUND', 404, 'Workflow instance not found');
    }

    const steps = await workflowRepository.listStepsForInstance(ctx, instanceId);
    const decisions = await workflowRepository.listDecisionsForInstance(ctx, instanceId);
    assertCanView(instance, actor, steps, decisions);

    return { instance, steps, decisions };
  },

  /** US-WRK-002: pending tasks for the actor's role. */
  async listInbox(tenantId: string | null, actor: ActorContext) {
    const rows = await workflowRepository.listInboxForRole(tenantContextFor(tenantId), actor.role);
    return rows.filter((row) => row.instance.requestedById !== actor.userId);
  },

  /** US-WRK-003: workflows submitted by the actor. */
  async listMyRequests(tenantId: string | null, actor: ActorContext) {
    return workflowRepository.listByRequester(tenantContextFor(tenantId), actor.userId);
  },

  /** US-WRK-001: configure or override a workflow template. */
  async upsertTemplate(
    tenantId: string | null,
    workflowType: WorkflowType,
    input: UpsertTemplateInput,
    _actor: ActorContext,
  ) {
    const defaults = DEFAULT_WORKFLOW_CHAINS[workflowType];
    if (!defaults) {
      throw new LoomisError('VALIDATION_ERROR', 422, `Unknown workflow type: ${workflowType}`);
    }

    if (defaults.scope === 'platform' && tenantId !== null) {
      throw new LoomisError(
        'WORKFLOW_FORBIDDEN',
        403,
        'Platform workflow templates can only be configured by platform administrators',
      );
    }

    if (defaults.isMandatory && input.isActive === false) {
      throw new LoomisError(
        'WORKFLOW_TEMPLATE_MANDATORY',
        422,
        'Mandatory workflows cannot be disabled',
      );
    }

    return workflowRepository.upsertTemplate(
      tenantContextFor(tenantId),
      workflowType,
      input.approverChain,
      defaults.isMandatory,
      input.isActive ?? true,
    );
  },

  async listTemplates(tenantId: string | null) {
    const stored = await workflowRepository.listTemplates(tenantContextFor(tenantId));
    const storedTypes = new Set(stored.map((t) => t.workflowType));

    const resolved = stored.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      workflowType: t.workflowType as WorkflowType,
      approverChain: t.approverChain as ApproverChainStep[],
      isMandatory: t.isMandatory,
      isActive: t.isActive,
      updatedAt: t.updatedAt.toISOString(),
    }));

    for (const [type, def] of Object.entries(DEFAULT_WORKFLOW_CHAINS)) {
      const scopeMatch =
        (tenantId === null && def.scope === 'platform') ||
        (tenantId !== null && def.scope === 'tenant');
      if (!scopeMatch || storedTypes.has(type)) continue;
      resolved.push({
        id: type,
        tenantId,
        workflowType: type as WorkflowType,
        approverChain: def.chain,
        isMandatory: def.isMandatory,
        isActive: true,
        updatedAt: new Date(0).toISOString(),
      });
    }

    return resolved.sort((a, b) => a.workflowType.localeCompare(b.workflowType));
  },

  /**
   * Processes overdue active steps and escalates to the configured role
   * (FR-WFL-003). Intended for a background scheduler / BullMQ job.
   */
  async processDueEscalations(): Promise<number> {
    const now = new Date();
    const overdue = await workflowRepository.listOverdueActiveSteps(now);
    let count = 0;

    for (const { step, instance } of overdue) {
      const escalatedEvent: WorkflowEscalatedEvent = {
        eventId: uuidv7(),
        workflowInstanceId: instance.id,
        workflowType: instance.workflowType as WorkflowType,
        tenantId: instance.tenantId,
        workflowStepId: step.id,
        fromRole: step.approverRole,
        toRole: step.escalatesToRole!,
        dueAt: step.dueAt?.toISOString() ?? null,
        occurredAt: now.toISOString(),
      };

      await workflowRepository.escalateStep(tenantContextFor(instance.tenantId), {
        step,
        instance,
        escalatedEvent: escalatedEvent as unknown as Record<string, unknown>,
      });

      await dispatchEvent(WORKFLOW_EVENT_TYPES.escalated, escalatedEvent);
      count += 1;
    }

    return count;
  },
};
