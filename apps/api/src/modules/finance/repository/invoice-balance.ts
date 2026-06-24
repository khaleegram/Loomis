import { and, eq } from 'drizzle-orm';
import { invoices } from '../../../../drizzle/schema/finance.js';
import type { DbTransaction } from '../../../shared/db.js';

function deriveInvoiceStatus(amountChargedMinor: number, amountPaidMinor: number): string {
  if (amountPaidMinor <= 0) return 'issued';
  if (amountPaidMinor >= amountChargedMinor) return 'paid';
  return 'partially_paid';
}

/** Apply a verified payment amount to an invoice balance inside an open transaction. */
export async function applyAmountToInvoice(
  tx: DbTransaction,
  tenantId: string,
  invoiceId: string,
  amountMinor: number,
): Promise<void> {
  const [invoice] = await tx
    .select()
    .from(invoices)
    .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId)))
    .limit(1);
  if (!invoice) throw new Error('Invoice not found');

  const newPaid = invoice.amountPaidMinor + amountMinor;
  const newBalance = invoice.amountChargedMinor - newPaid;
  const invoiceStatus = deriveInvoiceStatus(invoice.amountChargedMinor, newPaid);

  await tx
    .update(invoices)
    .set({
      amountPaidMinor: newPaid,
      balanceMinor: newBalance,
      status: invoiceStatus,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoice.id)));
}
