export interface PaymentAllocation {
  invoiceId: string;
  termId: string;
  amountMinor: number;
}

export interface OpenInvoiceSlice {
  invoiceId: string;
  termId: string;
  balanceMinor: number;
  termStartDate: string | null;
  termSequence: number;
}

function compareFifo(a: OpenInvoiceSlice, b: OpenInvoiceSlice): number {
  if (a.termStartDate && b.termStartDate) {
    return a.termStartDate.localeCompare(b.termStartDate);
  }
  return a.termSequence - b.termSequence;
}

/** Allocate payment amount across open invoices oldest-first (arrears before current term). */
export function buildFifoAllocations(
  openInvoices: OpenInvoiceSlice[],
  amountMinor: number,
): PaymentAllocation[] {
  const sorted = [...openInvoices].sort(compareFifo);
  let remaining = amountMinor;
  const allocations: PaymentAllocation[] = [];

  for (const invoice of sorted) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, invoice.balanceMinor);
    if (slice <= 0) continue;
    allocations.push({
      invoiceId: invoice.invoiceId,
      termId: invoice.termId,
      amountMinor: slice,
    });
    remaining -= slice;
  }

  if (remaining > 0) {
    throw new Error('PAYMENT_AMOUNT_EXCEEDS_TOTAL_BALANCE');
  }

  return allocations;
}

export function totalOpenBalance(openInvoices: OpenInvoiceSlice[]): number {
  return openInvoices.reduce((sum, row) => sum + row.balanceMinor, 0);
}

export function oldestOpenInvoiceId(openInvoices: OpenInvoiceSlice[]): string | null {
  if (openInvoices.length === 0) return null;
  return [...openInvoices].sort(compareFifo)[0]!.invoiceId;
}

export function parsePaymentAllocations(
  metadata: Record<string, unknown> | null | undefined,
): PaymentAllocation[] | null {
  const raw = metadata?.allocations;
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];
  const allocations: PaymentAllocation[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return null;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.invoiceId !== 'string' ||
      typeof row.termId !== 'string' ||
      typeof row.amountMinor !== 'number'
    ) {
      return null;
    }
    allocations.push({
      invoiceId: row.invoiceId,
      termId: row.termId,
      amountMinor: row.amountMinor,
    });
  }
  return allocations;
}

export function parseCreditMinor(
  metadata: Record<string, unknown> | null | undefined,
): number | null {
  const raw = metadata?.creditMinor;
  if (raw == null) return null;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) return null;
  return raw;
}
