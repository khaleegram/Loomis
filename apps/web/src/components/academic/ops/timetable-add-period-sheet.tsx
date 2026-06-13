'use client';

import type { TimetableSubjectOptionResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  cn,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, BookOpen, Check, Clock, Search, User, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { appErrorMessage } from '@/lib/errors/app-error-message';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import { SEMANTIC, SURFACES } from '@/lib/design/surfaces';
import { formatTimeRange, weekdayLabel } from '@/lib/timetable/timetable-utils';

const ERROR_DISMISS_MS = 6000;

const assignLessonSchema = z.object({
  assignmentKey: z.string().min(1, 'Pick a subject and teacher'),
});

export type AssignLessonFormValues = z.infer<typeof assignLessonSchema>;

export interface TimetableSlotTarget {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  periodLabel: string;
}

interface TimetableAssignLessonSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: TimetableSlotTarget | null;
  classLabel: string | null;
  options: TimetableSubjectOptionResponse[];
  isSubmitting?: boolean;
  onSubmit: (values: {
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    subjectId: string;
    teacherStaffProfileId: string;
  }) => Promise<void>;
}

function optionKey(option: TimetableSubjectOptionResponse): string {
  return `${option.subjectId}:${option.teacherStaffProfileId}`;
}

export function TimetableAssignLessonSheet({
  open,
  onOpenChange,
  slot,
  classLabel,
  options,
  isSubmitting,
  onSubmit,
}: TimetableAssignLessonSheetProps) {
  const [search, setSearch] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<AssignLessonFormValues>({
    resolver: zodResolver(assignLessonSchema),
    defaultValues: { assignmentKey: '' },
  });

  const selectedKey = form.watch('assignmentKey');

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const subject = formatSubjectLabel(option.subjectId).toLowerCase();
      const teacher = option.teacherName.toLowerCase();
      return subject.includes(q) || teacher.includes(q);
    });
  }, [options, search]);

  const selectedOption = useMemo(
    () => options.find((o) => optionKey(o) === selectedKey) ?? null,
    [options, selectedKey],
  );

  useEffect(() => {
    if (open) {
      form.reset({ assignmentKey: '' });
      setSearch('');
      setSubmitError(null);
    }
  }, [open, slot, form]);

  useEffect(() => {
    if (!submitError) return;
    const timer = window.setTimeout(() => setSubmitError(null), ERROR_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [submitError]);

  async function handleSubmit(values: AssignLessonFormValues) {
    if (!slot) return;
    const option = options.find((o) => optionKey(o) === values.assignmentKey);
    if (!option) return;

    setSubmitError(null);
    try {
      await onSubmit({
        dayOfWeek: slot.dayOfWeek,
        startMinute: slot.startMinute,
        endMinute: slot.endMinute,
        subjectId: option.subjectId,
        teacherStaffProfileId: option.teacherStaffProfileId,
      });
      form.reset();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(appErrorMessage(err));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="space-y-1 border-b border-neutral-100 px-6 pb-5 pt-6 text-left">
          <SheetTitle className="text-lg font-extrabold tracking-tight text-neutral-900">
            Assign lesson
          </SheetTitle>
          <SheetDescription className="text-[13px] leading-relaxed text-neutral-500">
            Pick who teaches this period — the day and time are already set.
          </SheetDescription>
        </SheetHeader>

        {submitError ? (
          <Alert
            variant="destructive"
            role="alert"
            className="relative mx-0 rounded-none border-x-0 border-t-0 border-red-200 bg-red-50 px-6 py-3"
          >
            <AlertCircle aria-hidden className="size-4 text-red-600" />
            <AlertDescription className="pr-8 text-[13px] font-medium text-red-800">
              {submitError}
            </AlertDescription>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="absolute right-4 top-3 rounded-lg p-1 text-red-600 transition hover:bg-red-100"
              aria-label="Dismiss"
            >
              <X aria-hidden className="size-4" />
            </button>
          </Alert>
        ) : null}

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {slot ? (
            <div
              className="overflow-hidden rounded-2xl border border-brand-100/50 shadow-sm"
              style={{ background: SURFACES.hero }}
            >
              <div className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  {classLabel ? (
                    <span className="rounded-full bg-brand-600/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800">
                      {classLabel}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600 ring-1 ring-neutral-200/60">
                    {slot.periodLabel}
                  </span>
                </div>

                <p className="mt-3 text-xl font-extrabold tracking-tight text-neutral-900">
                  {weekdayLabel(slot.dayOfWeek)}
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-neutral-600">
                  <Clock aria-hidden className="size-3.5 shrink-0 text-brand-700" />
                  {formatTimeRange(slot.startMinute, slot.endMinute)}
                </p>
              </div>
            </div>
          ) : null}

          <Form {...form}>
            <form id="assign-lesson-form" onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 space-y-5">
              <FormField
                control={form.control}
                name="assignmentKey"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <div className="flex items-end justify-between gap-2">
                      <FormLabel className={ACADEMIC_UI.sectionLabel}>Subject & teacher</FormLabel>
                      {options.length > 0 ? (
                        <span className="text-[11px] font-medium text-neutral-400">
                          {filteredOptions.length} of {options.length}
                        </span>
                      ) : null}
                    </div>

                    {options.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-8 text-center">
                        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                          <BookOpen aria-hidden className="size-5" />
                        </span>
                        <p className="text-[13px] font-semibold text-neutral-700">No assignments yet</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                          Assign teachers to subjects for this class in Staff, then return here.
                        </p>
                      </div>
                    ) : (
                      <>
                        {options.length > 5 ? (
                          <div className="relative">
                            <Search
                              aria-hidden
                              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                            />
                            <Input
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              placeholder="Search subject or teacher…"
                              className="h-10 rounded-xl border-neutral-200 bg-white pl-9 text-[13px]"
                            />
                          </div>
                        ) : null}

                        <div className="max-h-[min(22rem,45vh)] space-y-2 overflow-y-auto pr-0.5">
                          {filteredOptions.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-[13px] text-neutral-500">
                              No matches for &ldquo;{search}&rdquo;
                            </p>
                          ) : (
                            filteredOptions.map((option) => {
                              const key = optionKey(option);
                              const isSelected = field.value === key;
                              return (
                                <button
                                  key={option.assignmentId}
                                  type="button"
                                  onClick={() => field.onChange(key)}
                                  className={cn(
                                    'flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition duration-200',
                                    isSelected
                                      ? 'border-brand-400 bg-brand-50/80 shadow-sm ring-1 ring-brand-200/60'
                                      : 'border-neutral-200/80 bg-white hover:border-brand-200 hover:bg-brand-50/30',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg',
                                      isSelected ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-500',
                                    )}
                                  >
                                    <BookOpen aria-hidden className="size-4" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[14px] font-bold text-neutral-900">
                                      {formatSubjectLabel(option.subjectId)}
                                    </span>
                                    <span className="mt-0.5 flex items-center gap-1 text-[12px] font-medium text-neutral-500">
                                      <User aria-hidden className="size-3 shrink-0" />
                                      <span className="truncate">{option.teacherName}</span>
                                    </span>
                                  </span>
                                  {isSelected ? (
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                                      <Check aria-hidden className="size-3.5" />
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedOption ? (
                <div className="rounded-xl border border-brand-100/60 bg-brand-50/40 px-3.5 py-3">
                  <p className={ACADEMIC_UI.sectionLabel}>Ready to add</p>
                  <p className="mt-1 text-[13px] font-semibold text-neutral-800">
                    {formatSubjectLabel(selectedOption.subjectId)}
                    <span className="font-medium text-neutral-500"> · {selectedOption.teacherName}</span>
                  </p>
                </div>
              ) : null}
            </form>
          </Form>
        </div>

        <SheetFooter className="mt-auto flex-row gap-2 border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 sm:justify-stretch">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl border-neutral-200 bg-white text-[13px] font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-lesson-form"
            className={cn('h-11 flex-1 rounded-xl text-[13px] font-semibold shadow-sm', SEMANTIC.cta.primary)}
            disabled={isSubmitting || options.length === 0 || !slot || !selectedKey}
          >
            {isSubmitting ? 'Saving…' : 'Add to grid'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** @deprecated Use TimetableAssignLessonSheet */
export const TimetableAddPeriodSheet = TimetableAssignLessonSheet;
