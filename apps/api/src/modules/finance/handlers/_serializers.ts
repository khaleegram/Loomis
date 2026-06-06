import type {
  FeeItemCategory,
  FeeStructureResponse,
  FeeStructureStatus,
  InvoiceResponse,
  InvoiceStatus,
  OutstandingBalanceRow,
  OutstandingBalancesResponse,
} from '@loomis/contracts';
import type { invoices } from '../../../../drizzle/schema/finance.js';
import type { FeeStructureWithItems, InvoiceWithItems } from '../repository/index.js';

type InvoiceRow = typeof invoices.$inferSelect;

export function feeStructureToResponse(data: FeeStructureWithItems): FeeStructureResponse {
  const { structure, items } = data;
  return {
    id: structure.id,
    tenantId: structure.tenantId,
    academicYearId: structure.academicYearId,
    termId: structure.termId,
    classLevelId: structure.classLevelId,
    status: structure.status as FeeStructureStatus,
    version: structure.version,
    totalAmountMinor: structure.totalAmountMinor,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category as FeeItemCategory,
      amountMinor: item.amountMinor,
    })),
    createdById: structure.createdById,
    lastAmendedById: structure.lastAmendedById ?? null,
    lastAmendmentWorkflowId: structure.lastAmendmentWorkflowId ?? null,
    createdAt: structure.createdAt.toISOString(),
    updatedAt: structure.updatedAt.toISOString(),
  };
}

export function invoiceToResponse(data: InvoiceWithItems): InvoiceResponse {
  const { invoice, items } = data;
  return {
    id: invoice.id,
    tenantId: invoice.tenantId,
    academicYearId: invoice.academicYearId,
    termId: invoice.termId,
    studentId: invoice.studentId,
    enrollmentId: invoice.enrollmentId ?? null,
    classLevelId: invoice.classLevelId,
    feeStructureId: invoice.feeStructureId,
    status: invoice.status as InvoiceStatus,
    amountChargedMinor: invoice.amountChargedMinor,
    amountPaidMinor: invoice.amountPaidMinor,
    balanceMinor: invoice.balanceMinor,
    dueDate: invoice.dueDate ?? null,
    issuedById: invoice.issuedById,
    issuedAt: invoice.issuedAt.toISOString(),
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category as FeeItemCategory,
      amountMinor: item.amountMinor,
    })),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export function outstandingBalancesToResponse(result: {
  termId: string;
  summary: {
    studentCount: number;
    totalChargedMinor: number;
    totalPaidMinor: number;
    totalBalanceMinor: number;
  };
  rows: InvoiceRow[];
}): OutstandingBalancesResponse {
  const rows: OutstandingBalanceRow[] = result.rows.map((row) => ({
    invoiceId: row.id,
    studentId: row.studentId,
    classLevelId: row.classLevelId,
    status: row.status as InvoiceStatus,
    amountChargedMinor: row.amountChargedMinor,
    amountPaidMinor: row.amountPaidMinor,
    balanceMinor: row.balanceMinor,
  }));
  return { termId: result.termId, summary: result.summary, rows };
}
