import type { FeeItemInput, OutstandingBalancesQuery } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import { writeDataAccess } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { termService } from '../../academic/index.js';
import { FINANCE_EVENT_TYPES } from '../events/types.js';
import { financeRepository, type InvoiceWithItems } from '../repository/index.js';
import type {
  ActorContext,
  AuditContext,
  BatchIssueInvoicesInput,
  IssueInvoiceInput,
} from '../types.js';
import { assertAuditAvailable, requireTenant, writeFinanceAudit } from './_shared.js';

interface ResolvedFeeStructure {
  feeStructureId: string;
  items: FeeItemInput[];
  totalAmountMinor: number;
}

/**
 * Resolves the fee structure to invoice from for a class level in a term. A
 * structure is usable unless it is `superseded`. Throws if none exists or it has
 * no items (FINANCE_NO_ACTIVE_FEE_STRUCTURE).
 */
async function resolveFeeStructure(
  tenantId: string,
  termId: string,
  classLevelId: string,
): Promise<ResolvedFeeStructure> {
  const structure = await financeRepository.findStructureByTermClass(tenantId, termId, classLevelId);
  if (!structure || structure.status === 'superseded') {
    throw new LoomisError(
      'FINANCE_NO_ACTIVE_FEE_STRUCTURE',
      409,
      'No active fee structure exists for this class level and term',
      { classLevelId },
    );
  }
  const withItems = await financeRepository.findStructureById(tenantId, structure.id);
  if (!withItems || withItems.items.length === 0) {
    throw new LoomisError(
      'FINANCE_NO_ACTIVE_FEE_STRUCTURE',
      409,
      'The fee structure for this class level has no fee items',
      { classLevelId },
    );
  }
  return {
    feeStructureId: structure.id,
    items: withItems.items.map((item) => ({
      name: item.name,
      category: item.category as FeeItemInput['category'],
      amountMinor: item.amountMinor,
    })),
    totalAmountMinor: structure.totalAmountMinor,
  };
}

async function createInvoiceFromStructure(params: {
  tenantId: string;
  academicYearId: string;
  termId: string;
  studentId: string;
  enrollmentId: string | null;
  classLevelId: string;
  dueDate: string | null;
  issuedById: string;
  structure: ResolvedFeeStructure;
}): Promise<InvoiceWithItems> {
  const invoiceId = uuidv7();
  return financeRepository.createInvoiceWithItems({
    id: invoiceId,
    tenantId: params.tenantId,
    academicYearId: params.academicYearId,
    termId: params.termId,
    studentId: params.studentId,
    enrollmentId: params.enrollmentId,
    classLevelId: params.classLevelId,
    feeStructureId: params.structure.feeStructureId,
    amountChargedMinor: params.structure.totalAmountMinor,
    dueDate: params.dueDate,
    issuedById: params.issuedById,
    items: params.structure.items,
    event: {
      aggregateType: 'invoice',
      aggregateId: invoiceId,
      eventType: FINANCE_EVENT_TYPES.invoiceIssued,
      tenantId: params.tenantId,
      payload: {
        tenantId: params.tenantId,
        invoiceId,
        termId: params.termId,
        studentId: params.studentId,
        classLevelId: params.classLevelId,
        amountChargedMinor: params.structure.totalAmountMinor,
        issuedById: params.issuedById,
      },
    },
  });
}

export const invoiceService = {
  /**
   * Issues a single invoice for a student for a term (FR-FIN-004 / US-FIN-005),
   * snapshotting the active fee structure's items. One invoice per (term,
   * student). Financial write → audited and fail-closed on audit.
   */
  async issueInvoice(
    tenantId: string,
    input: IssueInvoiceInput,
    actor: ActorContext,
    audit: AuditContext,
  ): Promise<InvoiceWithItems> {
    requireTenant(actor, tenantId);
    await assertAuditAvailable();

    const term = await termService.getTerm(tenantId, input.termId, actor);
    if (term.status === 'draft') {
      throw new LoomisError(
        'FINANCE_TERM_NOT_OPEN',
        409,
        'Invoices can only be issued once the term is open',
      );
    }

    const existing = await financeRepository.findInvoiceByTermStudent(
      tenantId,
      input.termId,
      input.studentId,
    );
    if (existing) {
      throw new LoomisError(
        'FINANCE_INVOICE_DUPLICATE',
        409,
        'An invoice already exists for this student in this term',
        { invoiceId: existing.id },
      );
    }

    const structure = await resolveFeeStructure(tenantId, input.termId, input.classLevelId);
    const result = await createInvoiceFromStructure({
      tenantId,
      academicYearId: input.academicYearId,
      termId: input.termId,
      studentId: input.studentId,
      enrollmentId: input.enrollmentId ?? null,
      classLevelId: input.classLevelId,
      dueDate: input.dueDate ?? null,
      issuedById: actor.userId,
      structure,
    });

    await writeFinanceAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'finance.invoice.issued',
      resourceType: 'invoice',
      resourceId: result.invoice.id,
      result: 'success',
      audit,
      metadata: { termId: input.termId, classLevelId: input.classLevelId },
    });

    return result;
  },

  /**
   * Batch-issues invoices for many students of a term. Pre-checks that every
   * requested class level has a usable fee structure (fails closed if not), then
   * issues one invoice per student, skipping those already invoiced for the term.
   */
  async batchIssueInvoices(
    tenantId: string,
    input: BatchIssueInvoicesInput,
    actor: ActorContext,
    audit: AuditContext,
  ): Promise<{ issued: number; skipped: number; invoices: InvoiceWithItems[] }> {
    requireTenant(actor, tenantId);
    await assertAuditAvailable();

    const term = await termService.getTerm(tenantId, input.termId, actor);
    if (term.status === 'draft') {
      throw new LoomisError(
        'FINANCE_TERM_NOT_OPEN',
        409,
        'Invoices can only be issued once the term is open',
      );
    }

    const classLevelIds = [...new Set(input.students.map((s) => s.classLevelId))];
    const structures = new Map<string, ResolvedFeeStructure>();
    for (const classLevelId of classLevelIds) {
      structures.set(classLevelId, await resolveFeeStructure(tenantId, input.termId, classLevelId));
    }

    const issuedInvoices: InvoiceWithItems[] = [];
    let skipped = 0;

    for (const student of input.students) {
      const existing = await financeRepository.findInvoiceByTermStudent(
        tenantId,
        input.termId,
        student.studentId,
      );
      if (existing) {
        skipped += 1;
        continue;
      }
      const structure = structures.get(student.classLevelId)!;
      const result = await createInvoiceFromStructure({
        tenantId,
        academicYearId: input.academicYearId,
        termId: input.termId,
        studentId: student.studentId,
        enrollmentId: student.enrollmentId ?? null,
        classLevelId: student.classLevelId,
        dueDate: input.dueDate ?? null,
        issuedById: actor.userId,
        structure,
      });
      issuedInvoices.push(result);
    }

    await writeFinanceAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'finance.invoice.batch_issued',
      resourceType: 'invoice',
      resourceId: null,
      result: 'success',
      audit,
      metadata: { termId: input.termId, issued: issuedInvoices.length, skipped },
    });

    return { issued: issuedInvoices.length, skipped, invoices: issuedInvoices };
  },

  async getInvoice(
    tenantId: string,
    invoiceId: string,
    actor: ActorContext,
  ): Promise<InvoiceWithItems> {
    requireTenant(actor, tenantId);
    const found = await financeRepository.findInvoiceById(tenantId, invoiceId);
    if (!found) {
      throw new LoomisError('FINANCE_INVOICE_NOT_FOUND', 404, 'Invoice not found');
    }
    return found;
  },

  async listInvoices(
    tenantId: string,
    termId: string,
    actor: ActorContext,
  ): Promise<InvoiceWithItems[]> {
    requireTenant(actor, tenantId);
    return financeRepository.listInvoicesByTerm(tenantId, termId);
  },

  /**
   * Outstanding fee balances for a term (US-FIN-005), tenant-scoped and served by
   * a dedicated index. Optionally filtered by class level and payment status.
   * Reading student financial data is recorded as a data-access event.
   */
  async getOutstandingBalances(
    tenantId: string,
    termId: string,
    query: OutstandingBalancesQuery,
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);

    const filters: { classLevelId?: string; status?: string } = {};
    if (query.classLevelId) filters.classLevelId = query.classLevelId;
    if (query.status) filters.status = query.status;

    const rows = await financeRepository.listOutstandingByTerm(tenantId, termId, filters);

    const summary = rows.reduce(
      (acc, row) => {
        acc.totalChargedMinor += row.amountChargedMinor;
        acc.totalPaidMinor += row.amountPaidMinor;
        acc.totalBalanceMinor += row.balanceMinor;
        return acc;
      },
      { studentCount: rows.length, totalChargedMinor: 0, totalPaidMinor: 0, totalBalanceMinor: 0 },
    );

    await writeDataAccess({
      tenantId,
      actorUserId: actor.userId,
      resourceType: 'invoice',
      resourceCount: rows.length,
      containsChildPii: false,
      containsFinancialData: true,
    });

    return { termId, summary, rows };
  },
};
