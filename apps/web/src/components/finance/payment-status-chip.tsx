'use client';

import type { PaymentStatus } from '@loomis/contracts';
import { Badge } from '@loomis/ui-web';

import {
  formatPaymentStatus,
  paymentStatusTone,
} from '@/lib/finance/finance-labels';

interface PaymentStatusChipProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentStatusChip({ status, className }: PaymentStatusChipProps) {
  const tone = paymentStatusTone(status);

  return (
    <Badge
      variant={tone === 'warning' ? 'gold' : tone === 'success' ? 'default' : 'outline'}
      className={className}
    >
      {formatPaymentStatus(status)}
    </Badge>
  );
}
