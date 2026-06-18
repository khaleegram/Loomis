import { Skeleton } from '@loomis/ui-web';
import { Suspense } from 'react';

import { ReportCardPrintView } from '@/components/academic/ops/report-card-print-view';

export const dynamic = 'force-dynamic';

function ReportCardPrintFallback() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white">
      <Skeleton className="h-12 w-64 rounded-lg" />
    </div>
  );
}

export default function ReportCardsPrintPage() {
  return (
    <Suspense fallback={<ReportCardPrintFallback />}>
      <ReportCardPrintView />
    </Suspense>
  );
}
