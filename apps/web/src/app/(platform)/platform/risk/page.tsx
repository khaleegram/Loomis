'use client';

import { useState } from 'react';
import type { IvpCasePriority } from '@loomis/contracts';
import { usePlatformRiskCases } from '@loomis/api-client';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { AlertTriangle, ShieldCheck, ShieldAlert, Eye } from 'lucide-react';

import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import { RiskSummaryBand } from '@/components/platform/risk-summary-band';
import { RiskCaseTable } from '@/components/platform/risk-case-table';
import { RiskCaseSheet } from '@/components/platform/risk-case-sheet';
import { PLATFORM_PAGE_CLASS } from '@/lib/platform/platform-ui';
import { SURFACES } from '@/lib/design/surfaces';

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
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <div className="space-y-6">
        <PlatformConsoleHero
          sectionLabel="Integrity verification"
          title="IVP risk cases"
          description="Triage, investigate, and resolve Integrity Verification Protocol anomaly cases."
          isLoading={isLoading}
          stats={[
            {
              label: 'Open cases',
              value: String(openCount),
              hint: 'Active investigations',
              icon: ShieldAlert,
              gradient: openCount > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g3,
            },
            {
              label: 'Urgent',
              value: String(counts.urgent),
              hint: 'Highest priority',
              icon: AlertTriangle,
              gradient: SURFACES.kpi.g4,
            },
            {
              label: 'Standard',
              value: String(counts.standard),
              hint: 'Normal queue',
              icon: ShieldCheck,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'Watchlist',
              value: String(counts.watchlist),
              hint: 'Monitoring only',
              icon: Eye,
              gradient: SURFACES.kpi.g1,
            },
          ]}
        />

        {isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load risk cases. Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : allClear ? (
          <div className={`flex flex-col items-center justify-center gap-4 rounded-2xl border border-brand-100/40 bg-white py-24 text-center shadow-sm`}>
            <div className="flex size-16 items-center justify-center rounded-full bg-accent-green-50">
              <ShieldCheck aria-hidden className="size-8 text-accent-green-600" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-neutral-900">All clear</p>
              <p className="mt-1 text-[13px] text-neutral-500">
                No active anomaly cases. The platform is clean.
              </p>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      <RiskCaseSheet caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />
    </PageBody>
  );
}
