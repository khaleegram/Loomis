'use client';

import {
  useAcademicTerms,
  useAcademicYears,
  useMyAssignments,
  useSubmitAssignment,
} from '@loomis/api-client';
import type { StudentAssignmentItemResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from '@loomis/ui-web';
import { useMemo, useState } from 'react';

import { PageBody, PageHeader } from '@/components/parent/parent-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { useAuth } from '@/lib/auth/auth-context';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function pickOpenTermId(terms: { id: string; status: string }[]): string | null {
  return (
    terms.find((term) => term.status === 'open')?.id ??
    terms.find((term) => term.status === 'census_locked')?.id ??
    terms[0]?.id ??
    null
  );
}

function AssignmentCard({
  item,
  onSubmit,
  isSubmitting,
}: {
  item: StudentAssignmentItemResponse;
  onSubmit: (assignmentId: string, content: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [content, setContent] = useState('');
  const submitted = item.mySubmission;

  return (
    <div className={`${ACADEMIC_UI.dataPanel} space-y-3 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-neutral-900">{item.title}</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            {formatSubjectLabel(item.subjectId)} · Due{' '}
            {new Date(item.dueAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        {submitted ? (
          <Badge variant={submitted.status === 'graded' ? 'success' : 'secondary'}>
            {submitted.status === 'graded'
              ? `Graded ${submitted.score}/${item.maxScore}`
              : submitted.status}
          </Badge>
        ) : (
          <Badge variant="warning">Not submitted</Badge>
        )}
      </div>
      <p className="whitespace-pre-wrap text-[13px] text-neutral-700">{item.instructions}</p>
      {submitted?.content ? (
        <div className="rounded-xl bg-neutral-50 p-3 text-[13px] text-neutral-700">{submitted.content}</div>
      ) : null}
      {!submitted ? (
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Type your answer or notes here…"
          />
          <Button
            size="sm"
            disabled={isSubmitting || content.trim().length === 0}
            onClick={() => void onSubmit(item.id, content.trim())}
          >
            Submit assignment
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function StudentAssignmentsPage() {
  const tenantId = useTenantId();
  const { session } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = useMemo(
    () => years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null,
    [years],
  );
  const termsQuery = useAcademicTerms(tenantId ?? '', activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const resolvedTermId = termId ?? pickOpenTermId(terms);

  const assignmentsQuery = useMyAssignments(tenantId ?? '', resolvedTermId);
  const submitAssignment = useSubmitAssignment(tenantId ?? '');

  if (session?.role !== 'student') {
    return (
      <>
        <PageHeader title="Assignments" description="Student homework portal" />
        <PageBody>
          <Alert>
            <AlertDescription>This page is for student accounts.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader title="My Assignments" description="Published homework for your class" />
      <PageBody>
        <div className="space-y-4">
          {terms.length > 0 ? (
            <div className={`${ACADEMIC_UI.dataPanel} p-4`}>
              <Label className="text-[12px] text-neutral-500">Term</Label>
              <Select value={resolvedTermId ?? ''} onValueChange={setTermId}>
                <SelectTrigger className="mt-2 max-w-xs">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {actionError ? (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}

          {assignmentsQuery.isLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : (assignmentsQuery.data?.assignments ?? []).length === 0 ? (
            <div className={`${ACADEMIC_UI.dataPanel} p-8 text-center`}>
              <p className="text-[13px] text-neutral-500">No published assignments for this term.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(assignmentsQuery.data?.assignments ?? []).map((item) => (
                <AssignmentCard
                  key={item.id}
                  item={item}
                  isSubmitting={submittingId === item.id}
                  onSubmit={async (assignmentId, content) => {
                    setActionError(null);
                    setSubmittingId(assignmentId);
                    try {
                      await submitAssignment.mutateAsync({ assignmentId, content });
                    } catch (err) {
                      setActionError(academicErrorMessage(err));
                    } finally {
                      setSubmittingId(null);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
