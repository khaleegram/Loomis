import type { FeeItemInput } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import { LoomisError } from '../../../shared/errors.js';
import { termService } from '../../academic/index.js';
import { workflowService } from '../../workflow/index.js';
import { FINANCE_EVENT_TYPES } from '../events/types.js';
import { financeRepository, type FeeStructureWithItems } from '../repository/index.js';
import type {
  ActorContext,
  AmendFeeStructureInput,
  AuditContext,
  CreateFeeStructureInput,
  UpdateFeeStructureInput,
} from '../types.js';
import { assertAuditAvailable, requireTenant, sumItemsMinor, writeFinanceAudit } from './_shared.js';

/** Term states in which a fee structure may still be edited directly (no approval). */
const DIRECTLY_EDITABLE_TERM_STATUS = 'draft';
/** Term states in which an amendment must go through Principal approval. */
const AMENDABLE_TERM_STATUSES = new Set(['open', 'census_locked']);

async function loadStructure(tenantId: string, structureId: string): Promise<FeeStructureWithItems> {
  const found = await financeRepository.findStructureById(tenantId, structureId);
  if (!found) {
    throw new LoomisError('FINANCE_FEE_STRUCTURE_NOT_FOUND', 404, 'Fee structure not found');
  }
  return found;
}

export const feeStructureService = {
  /**
   * Creates a fee structure for one class level in a term (FR-FIN-001 / US-FIN-001).
   * One structure per (tenant, term, class level). If the term has not yet opened
   * it is created as a `draft` (freely editable); once the term is open it is
   * created `active`. Financial write → audited and fail-closed on audit.
   */
  async createFeeStructure(
    tenantId: string,
    input: CreateFeeStructureInput,
    actor: ActorContext,
    audit: AuditContext,
  ): Promise<FeeStructureWithItems> {
    requireTenant(actor, tenantId);
    await assertAuditAvailable();

    const term = await termService.getTerm(tenantId, input.termId, actor);

    const existing = await financeRepository.findStructureByTermClass(
      tenantId,
      input.termId,
      input.classLevelId,
    );
    if (existing) {
      throw new LoomisError(
        'FINANCE_FEE_STRUCTURE_DUPLICATE',
        409,
        'A fee structure already exists for this class level and term',
        { feeStructureId: existing.id },
      );
    }

    const totalAmountMinor = sumItemsMinor(input.items);
    const status = term.status === DIRECTLY_EDITABLE_TERM_STATUS ? 'draft' : 'active';
    const structureId = uuidv7();

    const result = await financeRepository.createStructureWithItems({
      id: structureId,
      tenantId,
      academicYearId: input.academicYearId,
      termId: input.termId,
      classLevelId: input.classLevelId,
      status,
      items: input.items,
      totalAmountMinor,
      createdById: actor.userId,
      event: {
        aggregateType: 'fee_structure',
        aggregateId: structureId,
        eventType: FINANCE_EVENT_TYPES.feeStructureCreated,
        tenantId,
        payload: {
          tenantId,
          feeStructureId: structureId,
          termId: input.termId,
          classLevelId: input.classLevelId,
          version: 1,
          totalAmountMinor,
          actorId: actor.userId,
        },
      },
    });

    await writeFinanceAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'finance.fee_structure.created',
      resourceType: 'fee_structure',
      resourceId: result.structure.id,
      result: 'success',
      audit,
      metadata: {
        termId: input.termId,
        classLevelId: input.classLevelId,
        itemCount: input.items.length,
      },
    });

    return result;
  },

  async getFeeStructure(
    tenantId: string,
    structureId: string,
    actor: ActorContext,
  ): Promise<FeeStructureWithItems> {
    requireTenant(actor, tenantId);
    return loadStructure(tenantId, structureId);
  },

  async listFeeStructures(
    tenantId: string,
    termId: string,
    actor: ActorContext,
  ): Promise<FeeStructureWithItems[]> {
    requireTenant(actor, tenantId);
    return financeRepository.listStructuresByTerm(tenantId, termId);
  },

  /**
   * Directly edits a fee structure's items — allowed ONLY while its term is still
   * in draft (before opening). After the term opens, edits must go through
   * `requestAmendment` (Principal approval). Financial write → audited.
   */
  async updateFeeStructure(
    tenantId: string,
    structureId: string,
    input: UpdateFeeStructureInput,
    actor: ActorContext,
    audit: AuditContext,
  ): Promise<FeeStructureWithItems> {
    requireTenant(actor, tenantId);
    await assertAuditAvailable();

    const { structure } = await loadStructure(tenantId, structureId);
    const term = await termService.getTerm(tenantId, structure.termId, actor);
    if (term.status !== DIRECTLY_EDITABLE_TERM_STATUS) {
      throw new LoomisError(
        'FINANCE_FEE_STRUCTURE_NOT_EDITABLE',
        409,
        'The term has opened; fee changes now require Principal approval. Submit an amendment instead.',
      );
    }

    const totalAmountMinor = sumItemsMinor(input.items);
    const result = await financeRepository.replaceStructureItems({
      tenantId,
      structureId,
      items: input.items,
      totalAmountMinor,
      version: structure.version,
      event: {
        aggregateType: 'fee_structure',
        aggregateId: structureId,
        eventType: FINANCE_EVENT_TYPES.feeStructureUpdated,
        tenantId,
        payload: {
          tenantId,
          feeStructureId: structureId,
          termId: structure.termId,
          classLevelId: structure.classLevelId,
          version: structure.version,
          totalAmountMinor,
          actorId: actor.userId,
        },
      },
    });

    await writeFinanceAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'finance.fee_structure.updated',
      resourceType: 'fee_structure',
      resourceId: structureId,
      result: 'success',
      audit,
      metadata: { itemCount: input.items.length },
    });

    return result;
  },

  /**
   * Requests an amendment to a fee structure after its term has opened
   * (US-FIN-001). This does NOT apply the change — it routes to the Workflow
   * module for Principal approval (`fee_structure_change`). The pending items are
   * carried in the workflow payload; the `workflow.completed` consumer applies
   * them on approval. The request itself is audited.
   */
  async requestAmendment(
    tenantId: string,
    structureId: string,
    input: AmendFeeStructureInput,
    actor: ActorContext,
    audit: AuditContext,
  ): Promise<{ feeStructureId: string; workflowInstanceId: string; status: 'pending' }> {
    requireTenant(actor, tenantId);
    await assertAuditAvailable();

    const { structure } = await loadStructure(tenantId, structureId);
    const term = await termService.getTerm(tenantId, structure.termId, actor);

    if (term.status === DIRECTLY_EDITABLE_TERM_STATUS) {
      throw new LoomisError(
        'FINANCE_FEE_STRUCTURE_AMENDMENT_NOT_ALLOWED',
        409,
        'The term has not opened yet; edit the fee structure directly instead of amending.',
      );
    }
    if (!AMENDABLE_TERM_STATUSES.has(term.status)) {
      throw new LoomisError(
        'FINANCE_FEE_STRUCTURE_AMENDMENT_NOT_ALLOWED',
        409,
        'Fee structures cannot be amended once the term is closed.',
      );
    }

    const totalAmountMinor = sumItemsMinor(input.items);
    const workflow = await workflowService.startWorkflow({
      workflowType: 'fee_structure_change',
      tenantId,
      requestedById: actor.userId,
      requestedByRole: actor.role,
      subjectType: 'fee_structure',
      subjectId: structureId,
      title: `Fee structure amendment — ${structure.classLevelId}`,
      payload: {
        feeStructureId: structureId,
        termId: structure.termId,
        classLevelId: structure.classLevelId,
        items: input.items,
        proposedTotalMinor: totalAmountMinor,
        justification: input.justification,
      },
    });

    await writeFinanceAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'finance.fee_structure.amendment_requested',
      resourceType: 'fee_structure',
      resourceId: structureId,
      result: 'success',
      audit,
      metadata: {
        workflowInstanceId: workflow.workflowInstanceId,
        itemCount: input.items.length,
      },
    });

    return {
      feeStructureId: structureId,
      workflowInstanceId: workflow.workflowInstanceId,
      status: 'pending',
    };
  },

  /**
   * Applies an approved fee-structure amendment AFTER Principal approval has
   * completed. Called by the `workflow.completed` consumer — not reachable from a
   * route. Bumps the version and records the amendment provenance.
   *
   * Enforces segregation of duties (loomis-security): the approver must differ
   * from the requester (the Workflow engine already guarantees this; checked here
   * as defense in depth).
   */
  async applyApprovedAmendment(params: {
    tenantId: string;
    feeStructureId: string;
    items: FeeItemInput[];
    requestedById: string;
    approvedById: string;
    workflowInstanceId: string;
    eventId: string;
  }): Promise<void> {
    if (params.approvedById === params.requestedById) {
      throw new LoomisError(
        'WORKFLOW_APPROVER_IS_REQUESTER',
        403,
        'The approver of a fee-structure amendment cannot be the requester (CON-013)',
      );
    }

    const existing = await financeRepository.findStructureById(
      params.tenantId,
      params.feeStructureId,
    );
    if (!existing) return; // Structure removed before approval landed — nothing to apply.

    const totalAmountMinor = sumItemsMinor(params.items);
    const nextVersion = existing.structure.version + 1;

    await financeRepository.replaceStructureItems({
      tenantId: params.tenantId,
      structureId: params.feeStructureId,
      items: params.items,
      totalAmountMinor,
      version: nextVersion,
      status: 'active',
      lastAmendedById: params.approvedById,
      lastAmendmentWorkflowId: params.workflowInstanceId,
      event: {
        aggregateType: 'fee_structure',
        aggregateId: params.feeStructureId,
        eventType: FINANCE_EVENT_TYPES.feeStructureAmended,
        tenantId: params.tenantId,
        payload: {
          tenantId: params.tenantId,
          feeStructureId: params.feeStructureId,
          termId: existing.structure.termId,
          classLevelId: existing.structure.classLevelId,
          version: nextVersion,
          totalAmountMinor,
          actorId: params.approvedById,
          workflowInstanceId: params.workflowInstanceId,
        },
      },
    });

    await writeFinanceAudit({
      tenantId: params.tenantId,
      actorUserId: params.approvedById,
      actorType: 'system',
      action: 'finance.fee_structure.amended',
      resourceType: 'fee_structure',
      resourceId: params.feeStructureId,
      result: 'success',
      audit: { requestId: params.eventId },
      metadata: {
        workflowInstanceId: params.workflowInstanceId,
        version: nextVersion,
        requestedById: params.requestedById,
      },
    });
  },
};
