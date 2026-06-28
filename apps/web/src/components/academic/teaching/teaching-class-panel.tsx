'use client';

import { useMemo, useState } from 'react';
import {
  useAssignClassTeacher,
  useCreateSubjectAssignment,
  useRemoveSubjectAssignment,
} from '@loomis/api-client';
import type {
  TeachingRosterClassTeacherRow,
  TeachingRosterSubjectRow,
} from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  cn,
} from '@loomis/ui-web';
import { BookOpen, Shield, UserPlus } from 'lucide-react';

import { CardOptionPicker } from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { formatSubjectLabel, SCHOOL_SUBJECT_OPTIONS } from '@/lib/academic/ops-labels';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useCan, useRole } from '@/lib/auth/use-capability';
import { appErrorMessage } from '@/lib/errors/app-error-message';

interface TeacherOption {
  id: string;
  label: string;
}

interface TeachingClassPanelProps {
  tenantId: string;
  termId: string;
  classArmId: string;
  classLabel: string;
  subjectRows: TeachingRosterSubjectRow[];
  classTeacher: TeachingRosterClassTeacherRow | null;
  teacherOptions: TeacherOption[];
  onUpdated?: () => void;
}

type AssignMode = 'subject' | 'classTeacher' | null;

export function TeachingClassPanel({
  tenantId,
  termId,
  classArmId,
  classLabel,
  subjectRows,
  classTeacher,
  teacherOptions,
  onUpdated,
}: TeachingClassPanelProps) {
  const canAssignSubject = useCan('subject.assign');
  const canAssignClassTeacher = useCan('classteacher.assign');
  const role = useRole();
  const canRemove = role === 'school_owner' || role === 'principal';

  const createSubject = useCreateSubjectAssignment(tenantId);
  const removeSubject = useRemoveSubjectAssignment(tenantId);
  const assignClassTeacher = useAssignClassTeacher(tenantId);

  const [mode, setMode] = useState<AssignMode>(null);
  const [pendingSubjectId, setPendingSubjectId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const subjectById = useMemo(() => {
    const map = new Map<string, TeachingRosterSubjectRow>();
    for (const row of subjectRows) {
      map.set(row.subjectId, row);
    }
    return map;
  }, [subjectRows]);

  const pendingSubjectLabel = pendingSubjectId ? formatSubjectLabel(pendingSubjectId) : '';
  const existingForPending = pendingSubjectId ? subjectById.get(pendingSubjectId) : null;

  function openSubjectAssign(subjectId: string) {
    setPendingSubjectId(subjectId);
    setSelectedTeacherId(subjectById.get(subjectId)?.staffProfileId ?? '');
    setError(null);
    setMode('subject');
  }

  function openClassTeacherAssign() {
    setSelectedTeacherId(classTeacher?.staffProfileId ?? '');
    setError(null);
    setMode('classTeacher');
  }

  function closeDialog() {
    setMode(null);
    setPendingSubjectId(null);
    setSelectedTeacherId('');
    setError(null);
  }

  async function handleSubjectSubmit() {
    if (!pendingSubjectId || !selectedTeacherId) return;
    setPending(true);
    setError(null);
    try {
      if (
        existingForPending &&
        existingForPending.staffProfileId !== selectedTeacherId
      ) {
        if (!canRemove) {
          setError(
            'This subject already has a teacher. Only the principal or school owner can reassign — remove the current assignment first.',
          );
          setPending(false);
          return;
        }
        const reason = window.prompt('Reason for reassigning this subject teacher:');
        if (!reason || reason.length < 3) {
          setPending(false);
          return;
        }
        await removeSubject.mutateAsync({
          assignmentId: existingForPending.assignmentId,
          reason,
          staffProfileId: existingForPending.staffProfileId,
        });
      }

      if (
        !existingForPending ||
        existingForPending.staffProfileId !== selectedTeacherId
      ) {
        await createSubject.mutateAsync({
          staffProfileId: selectedTeacherId,
          termId,
          classArmId,
          subjectId: pendingSubjectId,
        });
      }

      closeDialog();
      onUpdated?.();
    } catch (err) {
      setError(appErrorMessage(err) || academicErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function handleClassTeacherSubmit() {
    if (!selectedTeacherId) return;
    setPending(true);
    setError(null);
    try {
      await assignClassTeacher.mutateAsync({
        staffProfileId: selectedTeacherId,
        termId,
        classArmId,
      });
      closeDialog();
      onUpdated?.();
    } catch (err) {
      setError(appErrorMessage(err) || academicErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn('overflow-hidden', ACADEMIC_UI.dataPanel)}>
      <div className="border-b border-brand-100/40 bg-brand-50/30 px-4 py-4 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
          Class arm
        </p>
        <p className="mt-1 text-lg font-extrabold tracking-tight text-neutral-900">{classLabel}</p>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <div className="rounded-xl border border-brand-100/50 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Shield aria-hidden className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                  Class teacher
                </p>
                <p className="text-[14px] font-bold text-neutral-900">
                  {classTeacher?.staffName ?? 'Not assigned'}
                </p>
                <p className="text-[12px] text-neutral-500">
                  Marks attendance and sees the class register.
                </p>
              </div>
            </div>
            {canAssignClassTeacher ? (
              <button
                type="button"
                className={ACADEMIC_UI.btnSecondary}
                onClick={openClassTeacherAssign}
              >
                <UserPlus aria-hidden className="size-4" />
                {classTeacher ? 'Change' : 'Assign'}
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <BookOpen aria-hidden className="size-4 text-brand-600" />
            <p className="text-[13px] font-bold text-neutral-800">Subjects</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-brand-100/40">
            <table className="w-full min-w-[480px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-brand-100/40 bg-brand-50/50 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {SCHOOL_SUBJECT_OPTIONS.map((subject) => {
                  const row = subjectById.get(subject.id);
                  return (
                    <tr
                      key={subject.id}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-neutral-800">{subject.label}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {row?.staffName ?? (
                          <span className="text-neutral-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canAssignSubject ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[12px] font-semibold text-brand-700"
                            onClick={() => openSubjectAssign(subject.id)}
                          >
                            {row ? 'Change' : 'Assign'}
                          </Button>
                        ) : null}
                        {canRemove && row ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn('ml-1 h-8 text-[12px]', SEMANTIC.danger.text)}
                            disabled={removeSubject.isPending}
                            onClick={async () => {
                              const reason = window.prompt('Reason for removing this assignment:');
                              if (!reason || reason.length < 3) return;
                              await removeSubject.mutateAsync({
                                assignmentId: row.assignmentId,
                                reason,
                                staffProfileId: row.staffProfileId,
                              });
                              onUpdated?.();
                            }}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={mode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === 'classTeacher'
                ? `Class teacher — ${classLabel}`
                : `Assign ${pendingSubjectLabel}`}
            </DialogTitle>
            <DialogDescription>
              {mode === 'classTeacher'
                ? 'Pick the teacher responsible for this class arm this term.'
                : `Choose who teaches ${pendingSubjectLabel} in ${classLabel}.`}
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <CardOptionPicker
            options={teacherOptions}
            value={selectedTeacherId}
            onChange={setSelectedTeacherId}
            searchPlaceholder="Search teacher…"
            emptyMessage="No teachers on staff — add teachers in Staff first."
            showSearchMin={4}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <button
              type="button"
              disabled={!selectedTeacherId || pending}
              className={ACADEMIC_UI.btnPrimary}
              onClick={() =>
                mode === 'classTeacher' ? void handleClassTeacherSubmit() : void handleSubjectSubmit()
              }
            >
              {pending ? 'Saving…' : 'Save assignment'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
