'use client';

import type { AssignmentResponse, SubmissionResponse } from '@loomis/contracts';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';

export { AssignmentCreateSheet, type AssignmentCreateForm, type AssignmentTeachingSlot } from './assignment-create-sheet';

const gradeSchema = z.object({
  score: z.coerce.number().int().min(0),
  feedback: z.string().max(2000).optional(),
});

type GradeForm = z.infer<typeof gradeSchema>;

interface AssignmentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: AssignmentResponse | null;
  submissions: SubmissionResponse[];
  studentNameById?: Record<string, string>;
  canGrade: boolean;
  gradingSubmissionId?: string | null;
  onGrade: (submissionId: string, values: GradeForm) => Promise<void>;
}

export function AssignmentDetailSheet({
  open,
  onOpenChange,
  assignment,
  submissions,
  studentNameById = {},
  canGrade,
  gradingSubmissionId,
  onGrade,
}: AssignmentDetailSheetProps) {
  const form = useForm<GradeForm>({
    resolver: zodResolver(gradeSchema),
    defaultValues: { score: 0, feedback: '' },
  });

  if (!assignment) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{assignment.title}</SheetTitle>
          <SheetDescription>{assignment.instructions}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className={`${ACADEMIC_UI.dataPanel} p-4 text-[13px] text-neutral-600`}>
            <p>Subject: {formatSubjectLabel(assignment.subjectId)}</p>
            <p>Due: {new Date(assignment.dueAt).toLocaleString()}</p>
            <p>Max score: {assignment.maxScore}</p>
            <p>Status: {assignment.status}</p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
              Submissions ({submissions.length})
            </p>
            {submissions.length === 0 ? (
              <p className="text-[13px] text-neutral-500">No submissions yet.</p>
            ) : (
              <ul className={`${ACADEMIC_UI.dataPanel} divide-y divide-neutral-100`}>
                {submissions.map((submission) => (
                  <li key={submission.id} className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-neutral-800">
                        {studentNameById[submission.studentId] ?? 'Student'}
                      </p>
                      <span className="text-[12px] capitalize text-neutral-500">{submission.status}</span>
                    </div>
                    {submission.content ? (
                      <p className="whitespace-pre-wrap text-[13px] text-neutral-700">{submission.content}</p>
                    ) : null}
                    {submission.score !== null ? (
                      <p className="text-[13px] font-semibold text-neutral-900">
                        Score: {submission.score}/{assignment.maxScore}
                      </p>
                    ) : null}
                    {canGrade && submission.status !== 'graded' ? (
                      <Form {...form}>
                        <form
                          className="grid gap-2 sm:grid-cols-[120px_1fr_auto]"
                          onSubmit={form.handleSubmit(async (values) => {
                            await onGrade(submission.id, values);
                          })}
                        >
                          <FormField
                            control={form.control}
                            name="score"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="number" max={assignment.maxScore} {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="feedback"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Feedback (optional)" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <Button type="submit" size="sm" disabled={gradingSubmissionId === submission.id}>
                            Grade
                          </Button>
                        </form>
                      </Form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
