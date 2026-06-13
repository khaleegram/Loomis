'use client';

import { usePublishTimetable, useTimetablePublishPreview } from '@loomis/api-client';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { TimetablePublishReview } from '@/components/academic/ops/timetable-publish-review';
import { PageBody } from '@/components/school/school-shell';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { useAcademicOpsContext } from '@/lib/academic/use-academic-ops-context';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function TimetablePublishPage() {
  const tenantId = useTenantId();
  const canManage = useCan('timetable.manage');
  const searchParams = useSearchParams();
  const ctx = useAcademicOpsContext(tenantId ?? '');

  const termFromQuery = searchParams.get('termId');
  useEffect(() => {
    if (termFromQuery) {
      ctx.setTermId(termFromQuery);
    }
  }, [termFromQuery, ctx.setTermId]);

  const previewQuery = useTimetablePublishPreview(tenantId ?? '', ctx.termId);
  const publish = usePublishTimetable(tenantId ?? '');

  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  const canPublish = canManage && ctx.activeTerm?.status === 'open';
  const activeYear = ctx.sortedYears.find((y) => y.id === ctx.yearId) ?? null;

  if (!tenantId) {
    return (
      <PageBody className="max-w-[900px] px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>No tenant context.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canManage) {
    return (
      <PageBody className="max-w-[900px] px-4 py-8">
        <Alert>
          <AlertDescription>You do not have permission to publish timetables.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!ctx.termId) {
    return (
      <PageBody className="max-w-[900px] px-4 py-8">
        <Alert>
          <AlertDescription>Select a term on the timetable page first.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className="max-w-[900px] px-4 py-6 sm:px-6 lg:py-8">
      {previewQuery.isLoading || !previewQuery.data ? (
        <Skeleton className="h-[32rem] w-full rounded-2xl" />
      ) : (
        <TimetablePublishReview
          preview={previewQuery.data}
          yearLabel={activeYear?.label ?? null}
          canPublish={canPublish}
          isPublishing={publish.isPending}
          published={published}
          error={error}
          onPublish={async () => {
            if (!ctx.termId) return;
            setError(null);
            try {
              await publish.mutateAsync({ termId: ctx.termId });
              setPublished(true);
              await previewQuery.refetch();
            } catch (err) {
              setError(academicErrorMessage(err));
            }
          }}
        />
      )}
    </PageBody>
  );
}
