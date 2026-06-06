import { and, asc, desc, eq, gt, inArray } from 'drizzle-orm';
import {
  feeStructureItems,
  feeStructures,
  invoiceItems,
  invoices,
} from '../../../../drizzle/schema/finance.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { DbTransaction } from '../../../shared/db.js';
import type { FeeItemInputDto, OutboxEventInput } from '../types.js';
import { financeOutboxRepository } from './outbox.repository.js';

type StructureRow = typeof feeStructures.$inferSelect;
type StructureItemRow = typeof feeStructureItems.$inferSelect;
type InvoiceRow = typeof invoices.$inferSelect;
type InvoiceItemRow = typeof invoiceItems.$inferSelect;

export interface FeeStructureWithItems {
  structure: StructureRow;
  items: StructureItemRow[];
}

export interface InvoiceWithItems {
  invoice: InvoiceRow;
  items: InvoiceItemRow[];
}

function structureItemValues(
  tenantId: string,
  feeStructureId: string,
  items: FeeItemInputDto[],
) {
  return items.map((item, index) => ({
    tenantId,
    feeStructureId,
    name: item.name,
    category: item.category,
    amountMinor: item.amountMinor,
    sortOrder: index,
  }));
}

async function loadStructureItems(tx: DbTransaction, tenantId: string, structureId: string) {
  return tx
    .select()
    .from(feeStructureItems)
    .where(
      and(
        eq(feeStructureItems.tenantId, tenantId),
        eq(feeStructureItems.feeStructureId, structureId),
      ),
    )
    .orderBy(asc(feeStructureItems.sortOrder));
}

export const financeRepository = {
  // ── Fee structures ───────────────────────────────────────────────────────────

  async createStructureWithItems(params: {
    id: string;
    tenantId: string;
    academicYearId: string;
    termId: string;
    classLevelId: string;
    status: string;
    items: FeeItemInputDto[];
    totalAmountMinor: number;
    createdById: string;
    event: OutboxEventInput;
  }): Promise<FeeStructureWithItems> {
    return withTenantContext(params.tenantId, async (tx) => {
      const [structure] = await tx
        .insert(feeStructures)
        .values({
          id: params.id,
          tenantId: params.tenantId,
          academicYearId: params.academicYearId,
          termId: params.termId,
          classLevelId: params.classLevelId,
          status: params.status,
          totalAmountMinor: params.totalAmountMinor,
          createdById: params.createdById,
        })
        .returning();
      if (!structure) throw new Error('Failed to create fee structure');

      const items = await tx
        .insert(feeStructureItems)
        .values(structureItemValues(params.tenantId, structure.id, params.items))
        .returning();

      await financeOutboxRepository.append(tx, params.event);
      return { structure, items };
    });
  },

  async findStructureById(tenantId: string, structureId: string): Promise<FeeStructureWithItems | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [structure] = await tx
        .select()
        .from(feeStructures)
        .where(and(eq(feeStructures.tenantId, tenantId), eq(feeStructures.id, structureId)))
        .limit(1);
      if (!structure) return null;
      const items = await loadStructureItems(tx, tenantId, structureId);
      return { structure, items };
    });
  },

  async findStructureByTermClass(tenantId: string, termId: string, classLevelId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [structure] = await tx
        .select()
        .from(feeStructures)
        .where(
          and(
            eq(feeStructures.tenantId, tenantId),
            eq(feeStructures.termId, termId),
            eq(feeStructures.classLevelId, classLevelId),
          ),
        )
        .limit(1);
      return structure ?? null;
    });
  },

  async listStructuresByTerm(tenantId: string, termId: string): Promise<FeeStructureWithItems[]> {
    return withTenantContext(tenantId, async (tx) => {
      const structures = await tx
        .select()
        .from(feeStructures)
        .where(and(eq(feeStructures.tenantId, tenantId), eq(feeStructures.termId, termId)))
        .orderBy(asc(feeStructures.id));
      if (structures.length === 0) return [];

      const allItems = await tx
        .select()
        .from(feeStructureItems)
        .where(
          and(
            eq(feeStructureItems.tenantId, tenantId),
            inArray(
              feeStructureItems.feeStructureId,
              structures.map((s) => s.id),
            ),
          ),
        )
        .orderBy(asc(feeStructureItems.sortOrder));

      return structures.map((structure) => ({
        structure,
        items: allItems.filter((item) => item.feeStructureId === structure.id),
      }));
    });
  },

  /**
   * Replaces the items of a structure and updates its denormalised total in one
   * transaction (used for both draft edits and applied amendments). The optional
   * fields support the post-approval path (status, version bump, amendment refs).
   */
  async replaceStructureItems(params: {
    tenantId: string;
    structureId: string;
    items: FeeItemInputDto[];
    totalAmountMinor: number;
    version: number;
    status?: string;
    lastAmendedById?: string | null;
    lastAmendmentWorkflowId?: string | null;
    event: OutboxEventInput;
  }): Promise<FeeStructureWithItems> {
    return withTenantContext(params.tenantId, async (tx) => {
      const now = new Date();
      await tx
        .delete(feeStructureItems)
        .where(
          and(
            eq(feeStructureItems.tenantId, params.tenantId),
            eq(feeStructureItems.feeStructureId, params.structureId),
          ),
        );

      const items = await tx
        .insert(feeStructureItems)
        .values(structureItemValues(params.tenantId, params.structureId, params.items))
        .returning();

      const [structure] = await tx
        .update(feeStructures)
        .set({
          totalAmountMinor: params.totalAmountMinor,
          version: params.version,
          ...(params.status !== undefined ? { status: params.status } : {}),
          ...(params.lastAmendedById !== undefined
            ? { lastAmendedById: params.lastAmendedById }
            : {}),
          ...(params.lastAmendmentWorkflowId !== undefined
            ? { lastAmendmentWorkflowId: params.lastAmendmentWorkflowId }
            : {}),
          updatedAt: now,
        })
        .where(
          and(eq(feeStructures.tenantId, params.tenantId), eq(feeStructures.id, params.structureId)),
        )
        .returning();
      if (!structure) throw new Error('Failed to update fee structure');

      await financeOutboxRepository.append(tx, params.event);
      return { structure, items };
    });
  },

  // ── Invoices ───────────────────────────────────────────────────────────────

  async findInvoiceById(tenantId: string, invoiceId: string): Promise<InvoiceWithItems | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId)))
        .limit(1);
      if (!invoice) return null;
      const items = await tx
        .select()
        .from(invoiceItems)
        .where(and(eq(invoiceItems.tenantId, tenantId), eq(invoiceItems.invoiceId, invoiceId)))
        .orderBy(asc(invoiceItems.sortOrder));
      return { invoice, items };
    });
  },

  async findInvoiceByTermStudent(tenantId: string, termId: string, studentId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            eq(invoices.termId, termId),
            eq(invoices.studentId, studentId),
          ),
        )
        .limit(1);
      return invoice ?? null;
    });
  },

  async createInvoiceWithItems(params: {
    id: string;
    tenantId: string;
    academicYearId: string;
    termId: string;
    studentId: string;
    enrollmentId: string | null;
    classLevelId: string;
    feeStructureId: string;
    amountChargedMinor: number;
    dueDate: string | null;
    issuedById: string;
    items: FeeItemInputDto[];
    event: OutboxEventInput;
  }): Promise<InvoiceWithItems> {
    return withTenantContext(params.tenantId, async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          id: params.id,
          tenantId: params.tenantId,
          academicYearId: params.academicYearId,
          termId: params.termId,
          studentId: params.studentId,
          enrollmentId: params.enrollmentId,
          classLevelId: params.classLevelId,
          feeStructureId: params.feeStructureId,
          status: 'issued',
          amountChargedMinor: params.amountChargedMinor,
          amountPaidMinor: 0,
          balanceMinor: params.amountChargedMinor,
          dueDate: params.dueDate,
          issuedById: params.issuedById,
        })
        .returning();
      if (!invoice) throw new Error('Failed to create invoice');

      const items = await tx
        .insert(invoiceItems)
        .values(
          params.items.map((item, index) => ({
            tenantId: params.tenantId,
            invoiceId: invoice.id,
            name: item.name,
            category: item.category,
            amountMinor: item.amountMinor,
            sortOrder: index,
          })),
        )
        .returning();

      await financeOutboxRepository.append(tx, params.event);
      return { invoice, items };
    });
  },

  async listInvoicesByTerm(tenantId: string, termId: string): Promise<InvoiceWithItems[]> {
    return withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.tenantId, tenantId), eq(invoices.termId, termId)))
        .orderBy(desc(invoices.id));
      if (rows.length === 0) return [];

      const allItems = await tx
        .select()
        .from(invoiceItems)
        .where(
          and(
            eq(invoiceItems.tenantId, tenantId),
            inArray(
              invoiceItems.invoiceId,
              rows.map((r) => r.id),
            ),
          ),
        )
        .orderBy(asc(invoiceItems.sortOrder));

      return rows.map((invoice) => ({
        invoice,
        items: allItems.filter((item) => item.invoiceId === invoice.id),
      }));
    });
  },

  /**
   * Outstanding-balance read (US-FIN-005): tenant-scoped, optionally filtered by
   * class level and payment status, returning only invoices with a positive
   * balance. Served by `invoices_outstanding_idx` / `invoices_tenant_term_class_status_idx`.
   */
  async listOutstandingByTerm(
    tenantId: string,
    termId: string,
    filters: { classLevelId?: string; status?: string },
  ): Promise<InvoiceRow[]> {
    return withTenantContext(tenantId, async (tx) => {
      const conditions = [
        eq(invoices.tenantId, tenantId),
        eq(invoices.termId, termId),
        gt(invoices.balanceMinor, 0),
      ];
      if (filters.classLevelId) {
        conditions.push(eq(invoices.classLevelId, filters.classLevelId));
      }
      if (filters.status) {
        conditions.push(eq(invoices.status, filters.status));
      }
      return tx
        .select()
        .from(invoices)
        .where(and(...conditions))
        .orderBy(asc(invoices.classLevelId), asc(invoices.studentId));
    });
  },
};
