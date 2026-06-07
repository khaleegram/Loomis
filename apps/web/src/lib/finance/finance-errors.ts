import { LoomisClientError } from '@loomis/api-client';

export function financeErrorMessage(error: unknown): string {
  if (!(error instanceof LoomisClientError)) {
    return error instanceof Error ? error.message : 'Something went wrong. Try again.';
  }

  switch (error.code) {
    case 'FINANCE_CANNOT_VERIFY_OWN_PAYMENT':
      return 'You cannot verify a payment you logged. Another staff member must verify it.';
    case 'FINANCE_PAYMENT_NOT_VERIFIABLE':
      return 'This payment is not in a verifiable state.';
    case 'FINANCE_PAYMENT_AMOUNT_EXCEEDS_BALANCE':
      return 'Payment amount exceeds the invoice balance.';
    case 'FINANCE_FEE_STRUCTURE_NOT_EDITABLE':
      return 'This fee structure cannot be edited directly. Request an amendment instead.';
    case 'FINANCE_FEE_STRUCTURE_AMENDMENT_NOT_ALLOWED':
      return 'Fee structure amendments are not allowed in the current term state.';
    case 'FINANCE_REFUND_PAYMENT_NOT_REFUNDABLE':
      return 'Only verified payments can be refunded.';
    case 'FINANCE_REFUND_AMOUNT_EXCEEDS_PAYMENT':
      return 'Refund amount cannot exceed the original payment.';
    case 'FINANCE_INVOICE_NOT_FOUND':
      return 'Invoice not found for this student.';
    case 'FINANCE_PAYMENT_NOT_FOUND':
      return 'Payment not found.';
    case 'FINANCE_TERM_NOT_OPEN':
      return 'The selected term is not open for financial operations.';
    case 'IDENTITY_STEPUP_REQUIRED':
      return 'Step-up verification is required before approving this refund.';
    case 'WORKFLOW_STEP_NOT_ACTIVE':
      return 'This approval step is no longer active.';
    case 'FORBIDDEN':
      return 'You do not have permission for this action.';
    default:
      return error.message;
  }
}
