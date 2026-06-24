'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  useAcademicYears,
  useBillingAdjustments,
  usePlatformBillingPreview,
  useRequestBillingAdjustment,
  useSnapshotNow,
} from '@loomis/api-client';
import { createPsfAdjustmentRequest } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Skeleton,
  Textarea,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { PlatformBillingHero } from '@/components/academic/platform-billing-hero';
import { PageBody } from '@/components/school/school-shell';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

const adjustmentFormSchema = createPsfAdjustmentRequest.omit({ studentIds: true }).extend({
  studentIdsText: z.string().min(1, 'Enter at least one student ID'),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

function formatStatus(termStatus: string, adjustmentEndsAt: string | null): string {
  if (termStatus === 'census_locked') {
    if (adjustmentEndsAt && new Date(adjustmentEndsAt) > new Date()) {
      return 'Adjustment window open';
    }
    return 'Snapshot taken';
  }
  if (termStatus === 'open') return 'Awaiting snapshot';
  return termStatus;
}

export default function PlatformBillingPage() {
  const tenantId = useTenantId();
  const searchParams = useSearchParams();
  const termId = searchParams.get('termId') ?? '';
  const yearId = searchParams.get('yearId') ?? '';
  const canView = useCan('census.lock');
  const isOwner = useCan('census.lock'); // Owner-only actions gated in API

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const yearLabel = yearsQuery.data?.academicYears.find((y) => y.id === yearId)?.label ?? null;

  const preview = usePlatformBillingPreview(tenantId ?? '', termId);
  const adjustments = useBillingAdjustments(tenantId ?? '', termId);
  const snapshotNow = useSnapshotNow({ tenantId: tenantId ?? '', yearId, termId });
  const requestAdjustment = useRequestBillingAdjustment(tenantId ?? '', termId, yearId);

  const [showSnapshotConfirm, setShowSnapshotConfirm] = useState(false);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      deltaType: 'remove_students',
      studentIdsText: '',
      reason: '',
    },
  });

  const psfTotalMinor = useMemo(() => {
    if (!preview.data?.psfRateMinor) return null;
    return preview.data.psfRateMinor * preview.data.systemBillableCount;
  }, [preview.data]);

  const adjustmentWindowOpen =
    preview.data?.adjustmentWindowEndsAt &&
    new Date(preview.data.adjustmentWindowEndsAt) > new Date() &&
    preview.data.termStatus === 'census_locked';

  const canSnapshotEarly =
    preview.data?.termStatus === 'open' && preview.data.censusSnapshotDate;

  if (!canView) {
    return (
      <PageBody className={pageClass}>
        <Alert>
          <AlertDescription>You do not have access to platform billing.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!termId || !yearId) {
    return (
      <PageBody className={pageClass}>
        <div className={ACADEMIC_UI.dataPanel + ' p-6'}>
          <p className="text-sm text-neutral-600">
            Select a term from{' '}
            <Link href="/school/academic/sessions" className="font-semibold text-brand-700 underline">
              Academic sessions
            </Link>{' '}
            to view platform billing.
          </p>
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-8">
        <PlatformBillingHero
          termLabel={preview.data?.termName ?? null}
          yearLabel={yearLabel}
          systemCount={preview.data?.systemBillableCount ?? 0}
          minimumTermCommitment={preview.data?.minimumTermCommitment ?? null}
          psfRateMinor={preview.data?.psfRateMinor ?? null}
          psfTotalMinor={psfTotalMinor}
          snapshotDate={preview.data?.censusSnapshotDate ?? null}
          statusLabel={formatStatus(
            preview.data?.termStatus ?? 'open',
            preview.data?.adjustmentWindowEndsAt ?? null,
          )}
          isLoading={preview.isLoading}
        />

        <div className="pt-20 space-y-6">
          {preview.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{academicErrorMessage(preview.error)}</AlertDescription>
            </Alert>
          ) : null}

          <div className={ACADEMIC_UI.dataPanel + ' p-5 sm:p-6'}>
            <h2 className="text-sm font-extrabold text-neutral-900">Snapshot status</h2>
            {preview.isLoading ? (
              <Skeleton className="mt-4 h-20 w-full" />
            ) : (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-neutral-500">Scheduled snapshot</dt>
                  <dd className="font-semibold">{preview.data?.censusSnapshotDate ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Snapshot taken</dt>
                  <dd className="font-semibold">
                    {preview.data?.snapshotCreatedAt
                      ? new Date(preview.data.snapshotCreatedAt).toLocaleString()
                      : 'Not yet'}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Adjustment window ends</dt>
                  <dd className="font-semibold">
                    {preview.data?.adjustmentWindowEndsAt
                      ? new Date(preview.data.adjustmentWindowEndsAt).toLocaleString()
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Class breakdown</dt>
                  <dd className="font-semibold">
                    {preview.data?.classLevelBreakdown.length ?? 0} class levels
                  </dd>
                </div>
              </dl>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {canSnapshotEarly && isOwner ? (
                showSnapshotConfirm ? (
                  <>
                    <Button
                      className={ACADEMIC_UI.btnPrimary}
                      disabled={snapshotNow.isPending}
                      onClick={() =>
                        snapshotNow.mutate(
                          { confirmed: true },
                          { onSuccess: () => setShowSnapshotConfirm(false) },
                        )
                      }
                    >
                      {snapshotNow.isPending ? 'Taking snapshot…' : 'Confirm snapshot now'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowSnapshotConfirm(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button className={ACADEMIC_UI.btnPrimary} onClick={() => setShowSnapshotConfirm(true)}>
                    Take snapshot now
                  </Button>
                )
              ) : null}

              {adjustmentWindowOpen && isOwner ? (
                <Button
                  variant="outline"
                  className={ACADEMIC_UI.btnSecondary}
                  onClick={() => setShowAdjustmentForm((v) => !v)}
                >
                  Request correction
                </Button>
              ) : null}
            </div>

            {snapshotNow.isError ? (
              <p className="mt-3 text-sm text-red-600">{academicErrorMessage(snapshotNow.error)}</p>
            ) : null}
          </div>

          {showAdjustmentForm ? (
            <div className={ACADEMIC_UI.dataPanel + ' p-5 sm:p-6'}>
              <h2 className="text-sm font-extrabold text-neutral-900">Request billing correction</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Platform Operations must approve before PSF amounts change.
              </p>
              <Form {...form}>
                <form
                  className="mt-4 space-y-4"
                  onSubmit={form.handleSubmit((values) => {
                    const studentIds = values.studentIdsText
                      .split(/[\s,]+/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    requestAdjustment.mutate(
                      {
                        deltaType: values.deltaType,
                        reason: values.reason,
                        studentIds,
                      },
                      {
                        onSuccess: () => {
                          setShowAdjustmentForm(false);
                          form.reset();
                        },
                      },
                    );
                  })}
                >
                  <FormField
                    control={form.control}
                    name="deltaType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correction type</FormLabel>
                        <FormControl>
                          <select
                            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            <option value="remove_students">Remove students from snapshot</option>
                            <option value="add_students">Add students to snapshot</option>
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="studentIdsText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student IDs (comma or space separated)</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {requestAdjustment.isError ? (
                    <p className="text-sm text-red-600">{academicErrorMessage(requestAdjustment.error)}</p>
                  ) : null}
                  <Button type="submit" className={ACADEMIC_UI.btnPrimary} disabled={requestAdjustment.isPending}>
                    Submit request
                  </Button>
                </form>
              </Form>
            </div>
          ) : null}

          {(adjustments.data?.requests.length ?? 0) > 0 ? (
            <div className={ACADEMIC_UI.dataPanel + ' overflow-x-auto p-0'}>
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-brand-100/40 bg-brand-50/40 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Students</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.data?.requests.map((row) => (
                    <tr key={row.id} className="border-b border-neutral-100">
                      <td className="px-4 py-3">{row.deltaType.replace('_', ' ')}</td>
                      <td className="px-4 py-3">{row.studentIds.length}</td>
                      <td className="px-4 py-3 capitalize">{row.status}</td>
                      <td className="px-4 py-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </PageBody>
  );
}
