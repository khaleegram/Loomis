'use client';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Sheet,
  SheetContent,
  Textarea,
  cn,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, CalendarClock, ClipboardList, Sparkles } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  AssignmentSubjectRail,
  AssignmentSubjectRailHeader,
  type AssignmentTeachingSlot,
} from '@/components/academic/ops/assignment-subject-rail';
import {
  ChipOptionPicker,
  FormContextCard,
  FormSubmitError,
  SmartFieldLabel,
  SmartFormFooter,
  SmartFormHeader,
  SmartHint,
  smartInputClass,
} from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import {
  ASSIGNMENT_MAX_SCORE_PRESETS,
  ASSIGNMENT_TITLE_PRESETS,
  buildDueDatePresets,
  duePresetKeyForValue,
  formatDuePreview,
  toDateTimeLocalValue,
} from '@/lib/academic/assignment-form';

const createSchema = z.object({
  teachingSlotId: z.string().uuid('Pick the class and subject'),
  title: z.string().min(1, 'Give this assignment a title').max(200),
  instructions: z.string().min(1, 'Add instructions for students').max(5000),
  dueAt: z.string().min(1, 'Choose when work is due'),
  maxScore: z.coerce.number().int().min(1).max(1000),
});

export type AssignmentCreateForm = z.infer<typeof createSchema>;

export type { AssignmentTeachingSlot };

interface AssignmentCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachingSlots: AssignmentTeachingSlot[];
  isSubmitting?: boolean;
  onSubmit: (values: AssignmentCreateForm, slot: AssignmentTeachingSlot) => Promise<void>;
}

const FORM_ID = 'assignment-create-form';

export function AssignmentCreateSheet({
  open,
  onOpenChange,
  teachingSlots,
  isSubmitting,
  onSubmit,
}: AssignmentCreateSheetProps) {
  const duePresets = useMemo(() => buildDueDatePresets(), []);

  const form = useForm<AssignmentCreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      teachingSlotId: '',
      title: '',
      instructions: '',
      dueAt: duePresets[0]?.iso ?? '',
      maxScore: 100,
    },
  });

  const teachingSlotId = form.watch('teachingSlotId');
  const title = form.watch('title');
  const instructions = form.watch('instructions');
  const dueAt = form.watch('dueAt');
  const maxScore = form.watch('maxScore');

  const selectedSlot = useMemo(
    () => teachingSlots.find((slot) => slot.assignmentId === teachingSlotId) ?? null,
    [teachingSlots, teachingSlotId],
  );

  const duePreview = formatDuePreview(dueAt);
  const duePresetKey = duePresetKeyForValue(dueAt, duePresets);
  const instructionsLength = instructions.length;

  useEffect(() => {
    if (!open) return;
    form.reset({
      teachingSlotId: teachingSlots.length === 1 ? (teachingSlots[0]?.assignmentId ?? '') : '',
      title: '',
      instructions: '',
      dueAt: duePresets[0]?.iso ?? '',
      maxScore: 100,
    });
    form.clearErrors();
  }, [open, teachingSlots, duePresets, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const slot = teachingSlots.find((item) => item.assignmentId === values.teachingSlotId);
    if (!slot) return;
    try {
      await onSubmit(values, slot);
      onOpenChange(false);
    } catch {
      // Parent surfaces API errors — keep sheet open.
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SmartFormHeader
          surface="sheet"
          eyebrow="Homework & classwork"
          title="New assignment"
          description="Choose the class and subject, then draft the work. Publish when students should see it."
        />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <Form {...form}>
              <form id={FORM_ID} className="space-y-6" onSubmit={handleSubmit}>
                <FormField
                  control={form.control}
                  name="teachingSlotId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <AssignmentSubjectRailHeader />
                      <FormControl>
                        <AssignmentSubjectRail
                          slots={teachingSlots}
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormContextCard
                  badge="Live preview"
                  title={title.trim() || 'Untitled assignment'}
                  subtitle={
                    selectedSlot
                      ? `${selectedSlot.subjectLabel} · ${selectedSlot.classLabel} · ${selectedSlot.termLabel}`
                      : 'Select a class above'
                  }
                >
                  <p className="mt-1 text-[12px] text-neutral-500">
                    {duePreview
                      ? `Due ${duePreview}${maxScore ? ` · ${maxScore} marks` : ''}`
                      : 'Set a due date below'}
                  </p>
                  {instructions.trim() ? (
                    <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-neutral-600">
                      {instructions.trim()}
                    </p>
                  ) : null}
                </FormContextCard>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <SmartFieldLabel>Title</SmartFieldLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Fractions worksheet — pages 12–14"
                          className={smartInputClass}
                          autoComplete="off"
                        />
                      </FormControl>
                      <ChipOptionPicker
                        options={ASSIGNMENT_TITLE_PRESETS}
                        value={
                          ASSIGNMENT_TITLE_PRESETS.find((preset) => preset.value === field.value)?.value ??
                          ''
                        }
                        onChange={(value) => field.onChange(value)}
                        disabled={isSubmitting}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <SmartFieldLabel>Instructions for students</SmartFieldLabel>
                        <span className="text-[11px] font-medium tabular-nums text-neutral-400">
                          {instructionsLength}/5000
                        </span>
                      </div>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={5}
                          placeholder="What should students do? Include materials, page numbers, or submission format."
                          className={cn(
                            smartInputClass,
                            'min-h-[120px] resize-y py-3 leading-relaxed',
                          )}
                        />
                      </FormControl>
                      <SmartHint>Parents see this after you publish — keep it clear and actionable.</SmartHint>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueAt"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <SmartFieldLabel>Due date & time</SmartFieldLabel>
                      <ChipOptionPicker
                        options={duePresets.map(({ value, label }) => ({ value, label }))}
                        value={duePresetKey === 'custom' ? '' : duePresetKey}
                        onChange={(key) => {
                          const preset = duePresets.find((item) => item.value === key);
                          if (preset) field.onChange(preset.iso);
                        }}
                        disabled={isSubmitting}
                      />
                      <FormControl>
                        <div className="relative">
                          <CalendarClock
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                          />
                          <Input
                            type="datetime-local"
                            {...field}
                            min={toDateTimeLocalValue(new Date())}
                            className={cn(smartInputClass, 'pl-9')}
                          />
                        </div>
                      </FormControl>
                      {duePreview ? (
                        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-800">
                          <Sparkles aria-hidden className="size-3.5" />
                          Students must submit by {duePreview}
                        </p>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxScore"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <SmartFieldLabel>Maximum score</SmartFieldLabel>
                      <ChipOptionPicker
                        options={ASSIGNMENT_MAX_SCORE_PRESETS}
                        value={String(field.value)}
                        onChange={(value) => field.onChange(Number(value))}
                        disabled={isSubmitting}
                      />
                      <FormControl>
                        <div className="relative max-w-[140px]">
                          <ClipboardList
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                          />
                          <Input
                            type="number"
                            min={1}
                            max={1000}
                            value={field.value}
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            onChange={(event) => {
                              const next = event.target.valueAsNumber;
                              field.onChange(Number.isFinite(next) ? next : 0);
                            }}
                            className={cn(smartInputClass, 'pl-9')}
                          />
                        </div>
                      </FormControl>
                      <SmartHint>Used when you grade submissions in the gradebook flow.</SmartHint>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root?.message ? (
                  <FormSubmitError message={form.formState.errors.root.message} />
                ) : null}
              </form>
            </Form>

            {teachingSlots.length === 0 ? (
              <div className={`${ACADEMIC_UI.dataPanel} flex items-start gap-3 p-4`}>
                <BookOpen aria-hidden className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                <p className="text-[13px] leading-relaxed text-neutral-600">
                  You need at least one subject assignment this term before creating homework.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <SmartFormFooter
          formId={FORM_ID}
          submitLabel="Save draft"
          pending={isSubmitting}
          disabled={teachingSlots.length === 0}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
