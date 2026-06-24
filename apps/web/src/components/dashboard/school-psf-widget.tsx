'use client';

import Link from 'next/link';
import { AlertTriangle, Percent } from 'lucide-react';
import { useTenantPsfStatus } from '@loomis/api-client';
import { formatKobo } from '@loomis/core';
import { Skeleton } from '@loomis/ui-web';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

interface SchoolPsfWidgetProps {
  tenantId: string;
}

export function SchoolPsfWidget({ tenantId }: SchoolPsfWidgetProps) {
  const { data, isLoading } = useTenantPsfStatus(tenantId, { live: true });

  if (isLoading) {
    return <Skeleton className="h-36 w-full rounded-2xl" />;
  }

  if (!data) return null;

  return (
    <section className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: SURFACES.kpi.g1 }}
          >
            <Percent aria-hidden className="size-5" />
          </span>
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Loomis platform fee</p>
            <p className="text-[1.125rem] font-extrabold tracking-tight text-neutral-900">
              {data.currentRateMinor != null
                ? `${formatKobo(data.currentRateMinor)} / student`
                : 'Rate pending'}
            </p>
            <p className="mt-0.5 text-[12px] text-neutral-500">
              {data.termLabel ? `${data.termLabel} · ` : ''}
              {data.obligationsOutstandingMinor > 0
                ? `${formatKobo(data.obligationsOutstandingMinor)} outstanding`
                : data.obligationsTotal > 0
                  ? 'All obligations settled'
                  : 'Recorded when census locks'}
            </p>
          </div>
        </div>
        <Link href="/school/finance/platform-fee" className={`${ACADEMIC_UI.btnPrimary} shrink-0`}>
          View platform fee
        </Link>
      </div>
      {data.suggestionPending && data.suggestedRateMinor != null ? (
        <div className="flex items-start gap-2 border-t border-amber-100 bg-amber-50/80 px-5 py-3 sm:px-6">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <p className="text-[12px] text-amber-900">
            Your school fees suggest a platform rate of {formatKobo(data.suggestedRateMinor)}.
            Platform operations will align your PSF after review.
          </p>
        </div>
      ) : null}
    </section>
  );
}
