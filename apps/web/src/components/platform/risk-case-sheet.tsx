'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Textarea,
  cn,
} from '@loomis/ui-web';
import { usePlatformRiskCase, useUpdateRiskCase } from '@loomis/api-client';
import type { IvpCaseStatus } from '@loomis/contracts';
import { useState } from 'react';
import { SeverityBadge } from './severity-badge';

const STATUS_OPTIONS: { value: IvpCaseStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'INVESTIGATING', label: 'Investigating' },
  { value: 'RESOLVED_EXPLAINED', label: 'Resolved — Explained' },
  { value: 'RESOLVED_CORRECTED', label: 'Resolved — Corrected' },
  { value: 'RESOLVED_ENFORCED', label: 'Resolved — Enforced' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

interface RiskCaseSheetProps {
  caseId: string | null;
  onClose: () => void;
}

export function RiskCaseSheet({ caseId, onClose }: RiskCaseSheetProps) {
  const { data: riskCase, isLoading } = usePlatformRiskCase(caseId ?? '');
  const updateCase = useUpdateRiskCase(caseId ?? '');

  const [newStatus, setNewStatus] = useState<IvpCaseStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleUpdate() {
    if (!newStatus && !notes) return;
    setSubmitError(null);
    try {
      await updateCase.mutateAsync({
        ...(newStatus ? { caseStatus: newStatus } : {}),
        ...(notes.trim() ? { resolutionNotes: notes.trim() } : {}),
      });
      setNewStatus('');
      setNotes('');
    } catch {
      setSubmitError('Failed to update case. Please try again.');
    }
  }

  return (
    <Sheet open={Boolean(caseId)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {isLoading || !riskCase ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="font-serif text-lg">IVP Anomaly Case</SheetTitle>
                <SeverityBadge priority={riskCase.priority} />
              </div>
              <SheetDescription className="flex flex-wrap gap-2 text-xs">
                <span className="font-mono text-muted-foreground">···{riskCase.id.slice(-12)}</span>
                <span className="text-muted-foreground opacity-50">·</span>
                <span>
                  Detected{' '}
                  {formatDistanceToNow(new Date(riskCase.detectedAt), { addSuffix: true })}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Case metadata */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </dt>
                  <dd className="mt-0.5">
                    <Badge
                      variant={
                        riskCase.caseStatus === 'OPEN'
                          ? 'destructive'
                          : riskCase.caseStatus === 'INVESTIGATING'
                            ? 'gold'
                            : 'secondary'
                      }
                    >
                      {riskCase.caseStatus.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Anomaly Score
                  </dt>
                  <dd
                    className={cn(
                      'mt-0.5 font-mono text-lg font-bold tabular-nums',
                      riskCase.anomalyScore >= 0.8
                        ? 'text-red-600 dark:text-red-400'
                        : riskCase.anomalyScore >= 0.5
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-foreground',
                    )}
                  >
                    {(riskCase.anomalyScore * 100).toFixed(0)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">/100</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Reported Enrollment
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {riskCase.reportedEnrollment.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Estimated Range
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {riskCase.estimatedRange.min.toLocaleString()}–
                    {riskCase.estimatedRange.max.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Earnings Held
                  </dt>
                  <dd className="mt-0.5">
                    {riskCase.referralEarningsHeld ? (
                      <Badge variant="destructive">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Assigned To
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {riskCase.assignedToId
                      ? `···${riskCase.assignedToId.slice(-8)}`
                      : '—'}
                  </dd>
                </div>
              </dl>

              {/* Existing resolution notes */}
              {riskCase.resolutionNotes ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Resolution Notes
                  </p>
                  <p className="mt-1.5 whitespace-pre-line rounded-md bg-muted p-3 text-sm text-foreground">
                    {riskCase.resolutionNotes}
                  </p>
                </div>
              ) : null}

              {/* Update actions */}
              {riskCase.caseStatus !== 'DISMISSED' &&
              !riskCase.caseStatus.startsWith('RESOLVED') ? (
                <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-forest-800 dark:bg-forest-900">
                  <p className="text-sm font-semibold text-foreground">Update case</p>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      New status
                    </label>
                    <Select
                      value={newStatus}
                      onValueChange={(v) => setNewStatus(v as IvpCaseStatus)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select status…" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.filter(
                          (o) => o.value !== riskCase.caseStatus,
                        ).map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Notes
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Resolution notes, evidence, or explanation…"
                      rows={3}
                      className="text-sm"
                    />
                  </div>

                  {submitError ? (
                    <Alert variant="destructive">
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  ) : null}

                  <Button
                    onClick={() => void handleUpdate()}
                    disabled={updateCase.isPending || (!newStatus && !notes.trim())}
                    size="sm"
                    className="w-full"
                  >
                    {updateCase.isPending ? 'Saving…' : 'Save update'}
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
