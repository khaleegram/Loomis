'use client';

import { useState } from 'react';
import {
  useApproveBillingAdjustment,
  usePlatformBillingAdjustments,
  useRejectBillingAdjustment,
} from '@loomis/api-client';
import { Alert, AlertDescription, Button, Input, Skeleton } from '@loomis/ui-web';

import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import { PLATFORM_PAGE_CLASS, PLATFORM_UI } from '@/lib/platform/platform-ui';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

export default function PlatformBillingAdjustmentsPage() {
  const { data, isLoading, isError, error } = usePlatformBillingAdjustments();
  const approve = useApproveBillingAdjustment();
  const reject = useRejectBillingAdjustment();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  return (
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <PlatformConsoleHero
        sectionLabel="Platform operations"
        title="Billing adjustment requests"
        description="Review school owner correction requests submitted during the post-snapshot adjustment window."
      />

      <div className="mt-8 space-y-4">
        {isError ? (
          <Alert variant="destructive">
            <AlertDescription>{error instanceof Error ? error.message : 'Failed to load requests'}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : (data?.requests.length ?? 0) === 0 ? (
          <div className={PLATFORM_UI.dataPanel + ' p-6 text-sm text-neutral-600'}>No pending billing adjustments.</div>
        ) : (
          data?.requests.map((request) => (
            <div key={request.id} className={PLATFORM_UI.dataPanel + ' p-5 sm:p-6'}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {request.deltaType.replace('_', ' ')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">{request.reason}</p>
                  <p className="mt-2 text-xs text-neutral-500">
                    Tenant {request.tenantId.slice(0, 8)}… · Term {request.termId.slice(0, 8)}… ·{' '}
                    {request.studentIds.length} student(s)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className={ACADEMIC_UI.btnPrimary}
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(request.id)}
                  >
                    Approve
                  </Button>
                  <Button variant="outline" onClick={() => setRejectingId(request.id)}>
                    Reject
                  </Button>
                </div>
              </div>

              {rejectingId === request.id ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Rejection reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <Button
                    variant="destructive"
                    disabled={reject.isPending || rejectReason.length < 3}
                    onClick={() =>
                      reject.mutate(
                        { id: request.id, rejectionReason: rejectReason },
                        {
                          onSuccess: () => {
                            setRejectingId(null);
                            setRejectReason('');
                          },
                        },
                      )
                    }
                  >
                    Confirm reject
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </PageBody>
  );
}
