'use client';

import type { ClassTeacherAssignmentResponse, SubjectAssignmentResponse } from '@loomis/contracts';
import { BookOpen, GraduationCap, Users } from 'lucide-react';

import { formatSubjectLabel } from '@/lib/academic/ops-labels';

interface WorkloadOverviewProps {
  subjectAssignments: SubjectAssignmentResponse[];
  classTeacherAssignments: ClassTeacherAssignmentResponse[];
  classArms: { id: string; name: string }[];
  className?: string;
}

export function WorkloadOverview({
  subjectAssignments,
  classTeacherAssignments,
  classArms,
  className,
}: WorkloadOverviewProps) {
  const activeSubjects = subjectAssignments.filter((a) => a.active);
  const activeClassTeacher = classTeacherAssignments.filter((a) => a.active);

  const totalAssignments = activeSubjects.length + activeClassTeacher.length;

  if (totalAssignments === 0) {
    return (
      <div className={`card rounded-2xl p-6 ${className ?? ''}`}>
        <h3 className="mb-4 text-[13px] font-bold text-neutral-800">Workload Overview</h3>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-200 py-8">
          <GraduationCap aria-hidden className="size-8 text-neutral-200" />
          <p className="text-[12px] font-medium text-neutral-400">No active assignments</p>
          <p className="text-[11px] text-neutral-300">
            Assign subjects or class teacher duties to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card rounded-2xl p-6 ${className ?? ''}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-neutral-800">Workload Overview</h3>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-brand-700">
          {totalAssignments} total
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Subject Assignments */}
        <div className="rounded-xl border border-brand-50 bg-brand-50/10 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent-purple-100 text-accent-purple-600">
              <BookOpen aria-hidden className="size-3.5" />
            </span>
            <p className="text-[12px] font-semibold text-neutral-800">
              Subjects
              <span className="ml-1.5 tabular-nums text-neutral-400">({activeSubjects.length})</span>
            </p>
          </div>
          {activeSubjects.length > 0 ? (
            <div className="space-y-2">
              {activeSubjects.map((assignment) => {
                const armName = classArms.find((a) => a.id === assignment.classArmId)?.name ?? 'Class';
                return (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-[12px] shadow-sm"
                  >
                    <span className="font-medium text-neutral-700">
                      {formatSubjectLabel(assignment.subjectId)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <Users aria-hidden className="size-3" />
                      {armName}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-neutral-400">No subject assignments</p>
          )}
        </div>

        {/* Class Teacher Assignments */}
        <div className="rounded-xl border border-brand-50 bg-brand-50/10 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Users aria-hidden className="size-3.5" />
            </span>
            <p className="text-[12px] font-semibold text-neutral-800">
              Class Teacher
              <span className="ml-1.5 tabular-nums text-neutral-400">({activeClassTeacher.length})</span>
            </p>
          </div>
          {activeClassTeacher.length > 0 ? (
            <div className="space-y-2">
              {activeClassTeacher.map((assignment) => {
                const armName = classArms.find((a) => a.id === assignment.classArmId)?.name ?? 'Class';
                return (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-[12px] shadow-sm"
                  >
                    <span className="font-medium text-neutral-700">{armName}</span>
                    <span className="text-[11px] text-neutral-400">Class Teacher</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-neutral-400">No class teacher duties</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-brand-50/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
            Classes
          </p>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-neutral-800">
            {activeClassTeacher.length + activeSubjects.length}
          </p>
        </div>
        <div className="rounded-xl bg-brand-50/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
            Subjects
          </p>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-neutral-800">
            {activeSubjects.length}
          </p>
        </div>
        <div className="rounded-xl bg-brand-50/20 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
            Students
          </p>
          <p className="mt-1 text-sm font-extrabold tabular-nums text-neutral-400">
            Via classes
          </p>
        </div>
      </div>
    </div>
  );
}
