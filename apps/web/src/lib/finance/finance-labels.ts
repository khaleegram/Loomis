import type {
  FeeItemCategory,
  InvoiceStatus,
  OfflinePaymentMethod,
  PaymentStatus,
  RefundReasonCode,
  RefundRequestStatus,
} from '@loomis/contracts';
import type { JournalVoucherLeg } from '@loomis/ui-web';

const FEE_CATEGORY_LABELS: Record<FeeItemCategory, string> = {
  tuition: 'Tuition',
  development_levy: 'Development levy',
  uniform: 'Uniform',
  books: 'Books',
  exam: 'Exam fees',
  transport: 'Transport',
  feeding: 'Feeding',
  technology: 'Technology',
  boarding: 'Boarding',
  other: 'Other',
};

const PAYMENT_METHOD_LABELS: Record<OfflinePaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  pos: 'POS',
};

const REFUND_REASON_LABELS: Record<RefundReasonCode, string> = {
  duplicate: 'Duplicate payment',
  overpayment: 'Overpayment',
  student_withdrawal: 'Student withdrawal',
  service_failure: 'Service failure',
  chargeback: 'Chargeback',
  platform_error: 'Platform error',
  legal_compulsion: 'Legal compulsion',
};

export function formatFeeCategory(category: FeeItemCategory): string {
  return FEE_CATEGORY_LABELS[category] ?? category;
}

export function formatOfflinePaymentMethod(method: OfflinePaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function formatRefundReason(code: RefundReasonCode): string {
  return REFUND_REASON_LABELS[code] ?? code;
}

export function formatInvoiceStatus(status: InvoiceStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'issued':
      return 'Issued';
    case 'partially_paid':
      return 'Partially paid';
    case 'paid':
      return 'Paid';
    case 'void':
      return 'Void';
    default:
      return status;
  }
}

export function paymentStatusTone(
  status: PaymentStatus,
): 'warning' | 'success' | 'destructive' | 'secondary' {
  switch (status) {
    case 'pending_verification':
    case 'pending':
      return 'warning';
    case 'verified':
      return 'success';
    case 'failed':
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function formatPaymentStatus(status: PaymentStatus): string {
  switch (status) {
    case 'pending_verification':
      return 'Pending verification';
    case 'pending':
      return 'Pending';
    case 'verified':
      return 'Verified';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function formatRefundStatus(status: RefundRequestStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending approval';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'executed':
      return 'Executed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function formatClassLevelLabel(classLevelId: string): string {
  return `Class ···${classLevelId.slice(-8)}`;
}

export function formatStudentRef(studentId: string): string {
  return `···${studentId.slice(-8)}`;
}

/** Settlement voucher legs when an offline payment is verified (US-FIN-003). */
export function buildPaymentSettlementLegs(amountMinor: number): JournalVoucherLeg[] {
  return [
    {
      account: 'Cash / Bank',
      narration: 'Offline payment received',
      direction: 'debit',
      amountMinor,
    },
    {
      account: 'Accounts receivable — school fees',
      narration: 'Applied against student invoice',
      direction: 'credit',
      amountMinor,
    },
  ];
}

/** Reversal voucher legs for an executed refund (US-FIN-006). */
export function buildRefundReversalLegs(amountMinor: number): JournalVoucherLeg[] {
  return [
    {
      account: 'Accounts receivable — school fees',
      narration: 'Refund — fee obligation restored',
      direction: 'debit',
      amountMinor,
    },
    {
      account: 'Cash / Bank',
      narration: 'Refund disbursement',
      direction: 'credit',
      amountMinor,
    },
  ];
}

/** Provisional legs shown at cashier initiation before execution. */
export function buildRefundProvisionalLegs(amountMinor: number): JournalVoucherLeg[] {
  return buildRefundReversalLegs(amountMinor);
}
