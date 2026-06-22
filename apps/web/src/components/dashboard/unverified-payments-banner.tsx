'use client';

import { usePayments } from '@loomis/api-client';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { SEMANTIC } from '@/lib/design/surfaces';

interface UnverifiedPaymentsBannerProps {
  tenantId: string;
  termId?: string | null;
}

/** Amber escalation banner — Owner/Principal read-only link to accountant verify queue (§6 / SRS). */
export function UnverifiedPaymentsBanner({ tenantId, termId }: UnverifiedPaymentsBannerProps) {
  const pendingQuery = usePayments(tenantId, {
    termId: termId ?? undefined,
    status: 'pending_verification',
    channel: 'offline',
  });

  const count = pendingQuery.data?.payments.length ?? 0;
  if (pendingQuery.isLoading || count === 0) return null;

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between ${SEMANTIC.warning.surface}`}
      role="alert"
    >
      <div className="flex gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${SEMANTIC.warning.icon}`}
        >
          <AlertTriangle aria-hidden className="size-4" />
        </span>
        <div>
          <p className={`text-[13px] font-bold ${SEMANTIC.warning.title}`}>
            {count} offline payment{count === 1 ? '' : 's'} awaiting verification
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-gold-800/90">
            Cashier-logged payments need the accountant to verify before they count toward balances.
          </p>
        </div>
      </div>
      <Link
        href="/school/finance/payments/verify"
        className={`inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-4 text-[13px] font-semibold ${SEMANTIC.warning.button}`}
      >
        Open verify queue
      </Link>
    </div>
  );
}
