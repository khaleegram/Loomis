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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@loomis/ui-web';

import { PageBody, PageHeader } from '@/components/platform/platform-shell';

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
    <TableRow>
      <TableCell className="font-medium capitalize">
        {schedule.dataCategory.replace(/_/g, ' ')}
      </TableCell>
      <TableCell className="max-w-md text-xs text-muted-foreground">{schedule.description}</TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell>
        <Badge variant="outline">{schedule.anonymiseOnly ? 'Anonymise' : 'Delete'}</Badge>
      </TableCell>
    </TableRow>
  );
}

export default function RetentionConsentPage() {
  const { data: schedules, isLoading: schedulesLoading } = useRetentionSchedules();
  const { data: versions, isLoading: versionsLoading } = useConsentVersions();

  return (
    <>
      <PageHeader
        title="Retention & Consent"
        description="NDPA data retention policies and consent templates — US-AUD-005"
      />
      <PageBody>
        <Tabs defaultValue="retention">
          <TabsList>
            <TabsTrigger value="retention">Retention Policies</TabsTrigger>
            <TabsTrigger value="consent">Consent Versions</TabsTrigger>
          </TabsList>

          <TabsContent value="retention" className="mt-6">
            <div className="rounded-lg border border-neutral-200 bg-white shadow-card dark:border-forest-800 dark:bg-forest-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Retention Period</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedulesLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (schedules ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No retention schedules configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    (schedules ?? []).map((s) => <RetentionRow key={s.id} schedule={s} />)
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="consent" className="mt-6">
            <div className="rounded-lg border border-neutral-200 bg-white shadow-card dark:border-forest-800 dark:bg-forest-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : (versions ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No consent versions published
                      </TableCell>
                    </TableRow>
                  ) : (
                    (versions ?? []).map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-sm">{v.versionLabel}</TableCell>
                        <TableCell>
                          {new Date(v.effectiveFrom).toLocaleDateString('en-NG')}
                        </TableCell>
                        <TableCell className="max-w-md truncate text-xs">{v.contentSummary}</TableCell>
                        <TableCell>
                          {v.isActive ? (
                            <Badge className="bg-success/15 text-success">Active</Badge>
                          ) : (
                            <Badge variant="outline">Archived</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}
