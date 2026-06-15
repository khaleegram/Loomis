'use client';

import { useState } from 'react';
import type { RetentionScheduleResponse } from '@loomis/contracts';
import {
  useConsentVersions,
  useRetentionSchedules,
  useUpdateRetentionSchedule,
} from '@loomis/api-client';
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@loomis/ui-web';
import { FileText, Scale, Shield } from 'lucide-react';

import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import { PLATFORM_PAGE_CLASS, PLATFORM_UI } from '@/lib/platform/platform-ui';
import { SURFACES } from '@/lib/design/surfaces';

const RETENTION_PRESETS = [
  { label: '1 year', days: 365 },
  { label: '3 years', days: 1095 },
  { label: '5 years', days: 1825 },
  { label: '7 years', days: 2555 },
  { label: '10 years', days: 3650 },
];

function RetentionRow({ schedule }: { schedule: RetentionScheduleResponse }) {
  const update = useUpdateRetentionSchedule(schedule.id);
  const [pending, setPending] = useState(false);

  async function handleChange(days: string) {
    setPending(true);
    try {
      await update.mutateAsync({ retentionDays: Number(days) });
    } finally {
      setPending(false);
    }
  }

  const presetValue = RETENTION_PRESETS.find((p) => p.days === schedule.retentionDays)?.days;

  return (
    <tr className="border-t border-brand-50/80">
      <td className="px-4 py-3 font-medium capitalize text-neutral-900">
        {schedule.dataCategory.replace(/_/g, ' ')}
      </td>
      <td className="max-w-md px-4 py-3 text-[12px] text-neutral-500">{schedule.description}</td>
      <td className="px-4 py-3">
        <Select
          value={String(presetValue ?? schedule.retentionDays)}
          onValueChange={handleChange}
          disabled={pending || update.isPending}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RETENTION_PRESETS.map((p) => (
              <SelectItem key={p.days} value={String(p.days)}>
                {p.label}
              </SelectItem>
            ))}
            {!presetValue ? (
              <SelectItem value={String(schedule.retentionDays)}>
                Custom ({schedule.retentionDays}d)
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline">{schedule.anonymiseOnly ? 'Anonymise' : 'Delete'}</Badge>
      </td>
    </tr>
  );
}

type Tab = 'retention' | 'consent';

export default function RetentionConsentPage() {
  const [tab, setTab] = useState<Tab>('retention');
  const { data: schedules, isLoading: schedulesLoading } = useRetentionSchedules();
  const { data: versions, isLoading: versionsLoading } = useConsentVersions();

  const activeConsent = (versions ?? []).find((v) => v.isActive);

  return (
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <div className="space-y-6">
        <PlatformConsoleHero
          sectionLabel="Compliance · NDPA"
          title="Retention & consent"
          description="NDPA data retention policies and consent templates — US-AUD-005"
          isLoading={schedulesLoading}
          stats={[
            {
              label: 'Schedules',
              value: String(schedules?.length ?? 0),
              hint: 'Data categories',
              icon: Scale,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'Consent',
              value: activeConsent?.versionLabel ?? 'None',
              hint: 'Published version',
              icon: FileText,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'Versions',
              value: String(versions?.length ?? 0),
              hint: 'Historical records',
              icon: Shield,
              gradient: SURFACES.kpi.g3,
            },
            {
              label: 'Policy',
              value: 'NDPA',
              hint: '2023 compliant',
              icon: Shield,
              gradient: SURFACES.kpi.g4,
            },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={tab === 'retention' ? PLATFORM_UI.chipActive : PLATFORM_UI.chipInactive}
            onClick={() => setTab('retention')}
          >
            Retention policies
          </button>
          <button
            type="button"
            className={tab === 'consent' ? PLATFORM_UI.chipActive : PLATFORM_UI.chipInactive}
            onClick={() => setTab('consent')}
          >
            Consent versions
          </button>
        </div>

        {tab === 'retention' ? (
          <div className={`${PLATFORM_UI.dataPanel} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={PLATFORM_UI.tableHeader}>
                  <tr>
                    {['Category', 'Description', 'Retention period', 'Action'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedulesLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-brand-50/80">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (schedules ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-neutral-500">
                        No retention schedules configured
                      </td>
                    </tr>
                  ) : (
                    (schedules ?? []).map((s) => <RetentionRow key={s.id} schedule={s} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={`${PLATFORM_UI.dataPanel} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={PLATFORM_UI.tableHeader}>
                  <tr>
                    {['Version', 'Effective', 'Summary', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {versionsLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ) : (versions ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-neutral-500">
                        No consent versions published
                      </td>
                    </tr>
                  ) : (
                    (versions ?? []).map((v) => (
                      <tr key={v.id} className="border-t border-brand-50/80">
                        <td className="px-4 py-3 font-mono text-[13px] text-neutral-800">{v.versionLabel}</td>
                        <td className="px-4 py-3 text-neutral-700">
                          {new Date(v.effectiveFrom).toLocaleDateString('en-NG')}
                        </td>
                        <td className="max-w-md truncate px-4 py-3 text-[12px] text-neutral-500">
                          {v.contentSummary}
                        </td>
                        <td className="px-4 py-3">
                          {v.isActive ? (
                            <Badge className="bg-accent-green-100 text-accent-green-800">Active</Badge>
                          ) : (
                            <Badge variant="outline">Archived</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageBody>
  );
}
