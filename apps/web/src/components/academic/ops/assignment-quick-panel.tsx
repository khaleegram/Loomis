'use client';

import type { AssignmentResponse } from '@loomis/contracts';
import { BookOpen, CalendarClock, Plus } from 'lucide-react';

import type { AssignmentTeachingSlot } from '@/components/academic/ops/assignment-subject-rail';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface AssignmentQuickPanelProps {
  slots: AssignmentTeachingSlot[];
  assignments: AssignmentResponse[];
  canCreate: boolean;
  onCreate: () => void;
}

export function AssignmentQuickPanel({
  slots,
  assignments,
  canCreate,
  onCreate,
}: AssignmentQuickPanelProps) {
  const published = assignments.filter((assignment) => assignment.status === 'published').length;
  const upcoming = assignments.filter((assignment) => new Date(assignment.dueAt) > new Date()).length;

  return (
    <section className="card space-y-4 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <BookOpen aria-hidden className="size-5" />
          </span>
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Teacher assignments</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900">
              Give work fast
            </h2>
            <p className="mt-1 text-[13px] text-neutral-500">
              Pick from your assigned classes, add title, due date, instructions, then publish.
            </p>
          </div>
        </div>
        {canCreate ? (
          <button type="button" onClick={onCreate} className={ACADEMIC_UI.btnPrimary}>
            <Plus aria-hidden className="size-4" />
            New assignment
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Your classes</p>
          <p className="mt-1 text-lg font-extrabold text-neutral-900">{slots.length}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Published</p>
          <p className="mt-1 text-lg font-extrabold text-neutral-900">{published}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Upcoming due</p>
          <p className="mt-1 text-lg font-extrabold text-neutral-900">{upcoming}</p>
        </div>
      </div>

      {slots.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {slots.slice(0, 8).map((slot) => (
            <span
              key={slot.assignmentId}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700"
            >
              <CalendarClock aria-hidden className="size-3.5 text-brand-600" />
              {slot.classLabel} · {slot.subjectLabel}
            </span>
          ))}
        </div>
      ) : canCreate ? (
        <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-[13px] text-neutral-500">
          No assigned subject classes yet. Assign teachers to subjects before creating assignments.
        </p>
      ) : null}
    </section>
  );
}
