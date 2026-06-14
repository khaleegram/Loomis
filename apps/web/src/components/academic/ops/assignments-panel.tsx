'use client';

import type { AssignmentResponse } from '@loomis/contracts';
import { Badge, Button, Skeleton } from '@loomis/ui-web';
import { ClipboardList, Plus } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import { SURFACES } from '@/lib/design/surfaces';

interface AssignmentsHeroProps {
  classLabel: string | null;
  termLabel: string | null;
  assignmentCount: number;
  publishedCount: number;
  canCreate: boolean;
  onCreateClick?: () => void;
  isLoading?: boolean;
}

export function AssignmentsHero({
  classLabel,
  termLabel,
  assignmentCount,
  publishedCount,
  canCreate,
  onCreateClick,
  isLoading,
}: AssignmentsHeroProps) {
  return (
    <section className={`${SURFACES.hero} overflow-hidden rounded-2xl border border-brand-100/50 p-5 sm:p-6 lg:p-8`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Homework & classwork</p>
          <h1 className={ACADEMIC_UI.pageTitle} style={ACADEMIC_PAGE_TITLE_STYLE}>
            Assignments
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Create homework for your assigned subjects, publish to students, and grade submissions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-neutral-600">
            {termLabel ? <span className="rounded-lg bg-white/80 px-2.5 py-1">{termLabel}</span> : null}
            {classLabel ? <span className="rounded-lg bg-white/80 px-2.5 py-1">{classLabel}</span> : null}
          </div>
        </div>
        {canCreate ? (
          <button type="button" className={ACADEMIC_UI.btnPrimary} onClick={onCreateClick}>
            <Plus className="size-4" aria-hidden />
            New assignment
          </button>
        ) : null}
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <div className={`${ACADEMIC_UI.dataPanel} px-4 py-3`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Total</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{isLoading ? '—' : assignmentCount}</p>
        </div>
        <div className={`${ACADEMIC_UI.dataPanel} px-4 py-3`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Published</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{isLoading ? '—' : publishedCount}</p>
        </div>
        <div className={`${ACADEMIC_UI.dataPanel} flex items-center gap-2 px-4 py-3`}>
          <ClipboardList className="size-5 text-brand-600" aria-hidden />
          <p className="text-[13px] text-neutral-600">Students see published items in their portal.</p>
        </div>
      </div>
    </section>
  );
}

function statusBadge(status: AssignmentResponse['status']) {
  if (status === 'published') return <Badge variant="success">Published</Badge>;
  if (status === 'closed') return <Badge variant="neutral">Closed</Badge>;
  return <Badge variant="warning">Draft</Badge>;
}

interface AssignmentsListProps {
  assignments: AssignmentResponse[];
  classLabelByArmId: Map<string, string>;
  isLoading?: boolean;
  canManage: boolean;
  onOpen: (assignment: AssignmentResponse) => void;
  onPublish: (assignmentId: string) => void;
  publishingId?: string | null;
}

export function AssignmentsList({
  assignments,
  classLabelByArmId,
  isLoading,
  canManage,
  onOpen,
  onPublish,
  publishingId,
}: AssignmentsListProps) {
  if (isLoading) {
    return (
      <div className={`${ACADEMIC_UI.dataPanel} space-y-3 p-4`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className={`${ACADEMIC_UI.dataPanel} p-10 text-center`}>
        <p className="text-[13px] text-neutral-500">No assignments for this class yet.</p>
      </div>
    );
  }

  return (
    <div className={`${ACADEMIC_UI.dataPanel} divide-y divide-neutral-100`}>
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <button type="button" className="text-left" onClick={() => onOpen(assignment)}>
            <p className="font-semibold text-neutral-900">{assignment.title}</p>
            <p className="mt-1 text-[12px] text-neutral-500">
              {formatSubjectLabel(assignment.subjectId)} ·{' '}
              {classLabelByArmId.get(assignment.classArmId) ?? 'Class'} · Due{' '}
              {new Date(assignment.dueAt).toLocaleString('en-NG', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}{' '}
              · Max {assignment.maxScore}
            </p>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(assignment.status)}
            {canManage && assignment.status === 'draft' ? (
              <Button
                size="sm"
                onClick={() => onPublish(assignment.id)}
                disabled={publishingId === assignment.id}
              >
                {publishingId === assignment.id ? 'Publishing…' : 'Publish'}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => onOpen(assignment)}>
                View
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
