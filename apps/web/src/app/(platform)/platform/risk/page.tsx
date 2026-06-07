'use client';

import { useState } from 'react';
import type { IvpCasePriority } from '@loomis/contracts';
import { usePlatformRiskCases } from '@loomis/api-client';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { ShieldCheck } from 'lucide-react';

import { PageBody, PageHeader } from '@/components/platform/platform-shell';
import { RiskSummaryBand } from '@/components/platform/risk-summary-band';
import { RiskCaseTable } from '@/components/platform/risk-case-table';
import { RiskCaseSheet } from '@/components/platform/risk-case-sheet';

export default function RiskPage() {
  const [priorityFilter, setPriorityFilter] = useState<IvpCasePriority | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const { data, isLoading, isError } = usePlatformRiskCases();

  const cases = data?.cases ?? [];

  const counts: Record<IvpCasePriority, number> = {
    urgent: 0,
    standard: 0,
    watchlist: 0,
  };

  for (const c of cases) {
    if (c.caseStatus === 'OPEN' || c.caseStatus === 'INVESTIGATING') {
      counts[c.priority] = (counts[c.priority] ?? 0) + 1;
    }
  }

  const openCount = data?.openCount ?? 0;
  const allClear = !isLoading && !isError && openCount === 0;

  return (
    <>
      <PageHeader
        title="IVP Risk Cases"
        description="Integrity Verification Protocol anomaly cases — triage, investigate, and resolve."
      />
      <PageBody>
        {isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load risk cases. Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : allClear ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
              <ShieldCheck aria-hidden className="size-8 text-success" />
            </div>
            <div>
              <p className="font-serif text-xl font-semibold text-foreground">All clear</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No active anomaly cases. The platform is clean.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <RiskSummaryBand
              counts={counts}
              activeFilter={priorityFilter}
              onFilter={setPriorityFilter}
              totalOpen={openCount}
            />

            <RiskCaseTable
              cases={cases}
              isLoading={isLoading}
              priorityFilter={priorityFilter}
              onRowClick={setSelectedCaseId}
            />
          </div>
        )}
      </PageBody>

      <RiskCaseSheet
        caseId={selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
      />
    </>
  );
}
