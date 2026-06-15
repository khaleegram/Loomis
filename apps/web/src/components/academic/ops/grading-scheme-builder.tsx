'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createGradingSchemeRequest, type CreateGradingSchemeRequest, type GradeBand } from '@loomis/contracts';
import {
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  cn,
} from '@loomis/ui-web';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { FormSubmitError, smartInputClass } from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import {
  DEFAULT_GRADE_BANDS,
  GRADING_SCHEME_TEMPLATES,
} from '@/lib/academic/ops-labels';

interface GradingSchemeBuilderProps {
  onSubmit: (values: CreateGradingSchemeRequest) => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

type SchemeFormBand = z.input<typeof createGradingSchemeRequest>['gradeBands'][number];

const panelClass = 'overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-sm';

function Group({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{title}</p>
        {caption ? <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-400">{caption}</p> : null}
      </div>
      <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200/80 bg-white">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
  align = 'center',
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  align?: 'center' | 'start';
}) {
  return (
    <div
      className={cn(
        'flex gap-4 px-4 py-3.5 sm:px-5',
        align === 'center' ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : 'flex-col',
      )}
    >
      <div className="min-w-0 shrink-0 sm:max-w-[45%]">
        <p className="text-[15px] font-medium tracking-tight text-neutral-900">{label}</p>
        {hint ? <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">{hint}</p> : null}
      </div>
      <div className="min-w-0 flex-1 sm:max-w-[55%]">{children}</div>
    </div>
  );
}

function SchemeWeightSplit({
  caWeight,
  examWeight,
  onChange,
  disabled,
}: {
  caWeight: number;
  examWeight: number;
  onChange: (ca: number, exam: number) => void;
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const total = caWeight + examWeight;
  const balanced = total === 100;

  const setCa = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(next)));
      onChange(clamped, 100 - clamped);
    },
    [onChange],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragging.current || !trackRef.current || disabled) return;
      const rect = trackRef.current.getBoundingClientRect();
      setCa(((e.clientX - rect.left) / rect.width) * 100);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [disabled, setCa]);

  return (
    <div className="space-y-4">
      <div
        ref={trackRef}
        className={cn(
          'relative h-11 overflow-hidden rounded-full bg-neutral-100 ring-1 ring-inset',
          balanced ? 'ring-neutral-200/80' : 'ring-amber-300/80',
          disabled && 'opacity-60',
        )}
      >
        <div
          className="absolute inset-y-0 left-0 bg-brand-500 transition-[width] duration-150 ease-out"
          style={{ width: `${caWeight}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-[#c9a96e] transition-[width] duration-150 ease-out"
          style={{ width: `${examWeight}%` }}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label="Adjust CA and exam weight split"
          className={cn(
            'absolute top-1/2 z-10 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-md ring-1 ring-neutral-200/80',
            'touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
          )}
          style={{ left: `${caWeight}%` }}
          onPointerDown={(e) => {
            if (disabled) return;
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="rounded-xl bg-neutral-50 px-3 py-2.5 ring-1 ring-neutral-200/60">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-700">CA</span>
          <div className="mt-1 flex items-baseline gap-1">
            <input
              inputMode="numeric"
              disabled={disabled}
              value={caWeight}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value.replace(/\D/g, ''), 10);
                setCa(Number.isNaN(parsed) ? 0 : parsed);
              }}
              className="w-full bg-transparent text-[22px] font-semibold tabular-nums tracking-tight text-neutral-900 outline-none"
            />
            <span className="text-[15px] font-medium text-neutral-400">%</span>
          </div>
        </label>
        <label className="rounded-xl bg-neutral-50 px-3 py-2.5 ring-1 ring-neutral-200/60">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8a7348]">Exam</span>
          <div className="mt-1 flex items-baseline gap-1">
            <input
              inputMode="numeric"
              disabled={disabled}
              value={examWeight}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value.replace(/\D/g, ''), 10);
                const clamped = Math.max(0, Math.min(100, Number.isNaN(parsed) ? 0 : parsed));
                onChange(100 - clamped, clamped);
              }}
              className="w-full bg-transparent text-[22px] font-semibold tabular-nums tracking-tight text-neutral-900 outline-none"
            />
            <span className="text-[15px] font-medium text-neutral-400">%</span>
          </div>
        </label>
      </div>

      <p
        className={cn(
          'text-center text-[12px] font-medium',
          balanced ? 'text-emerald-600' : 'text-amber-700',
        )}
      >
        {balanced ? 'Weights balance at 100%' : `Total is ${total}% — adjust to reach 100%`}
      </p>
    </div>
  );
}

function GradeBandRow({
  band,
  index,
  onChange,
}: {
  band: SchemeFormBand;
  index: number;
  onChange: (index: number, patch: Partial<GradeBand>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="flex items-center gap-3 sm:w-16 sm:shrink-0">
        <span className="flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-[15px] font-bold text-neutral-800">
          <input
            value={band.grade}
            onChange={(e) => onChange(index, { grade: e.target.value })}
            className="w-full bg-transparent text-center text-[15px] font-bold outline-none"
            aria-label={`Grade letter row ${index + 1}`}
          />
        </span>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Min</span>
          <input
            inputMode="numeric"
            value={band.minScore}
            onChange={(e) =>
              onChange(index, {
                minScore: Number.parseInt(e.target.value.replace(/\D/g, ''), 10) || 0,
              })
            }
            className="h-10 w-full rounded-lg border-0 bg-neutral-50 px-3 text-[15px] font-medium tabular-nums text-neutral-900 ring-1 ring-neutral-200/70 outline-none focus:ring-2 focus:ring-brand-300/50"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Max</span>
          <input
            inputMode="numeric"
            value={band.maxScore}
            onChange={(e) =>
              onChange(index, {
                maxScore: Number.parseInt(e.target.value.replace(/\D/g, ''), 10) || 0,
              })
            }
            className="h-10 w-full rounded-lg border-0 bg-neutral-50 px-3 text-[15px] font-medium tabular-nums text-neutral-900 ring-1 ring-neutral-200/70 outline-none focus:ring-2 focus:ring-brand-300/50"
          />
        </label>
        <label className="col-span-2 space-y-1 sm:col-span-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Remark</span>
          <input
            value={band.remark ?? ''}
            onChange={(e) => onChange(index, { remark: e.target.value || null })}
            placeholder="e.g. Excellent"
            className="h-10 w-full rounded-lg border-0 bg-neutral-50 px-3 text-[14px] text-neutral-900 ring-1 ring-neutral-200/70 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-brand-300/50"
          />
        </label>
      </div>
    </div>
  );
}

export function GradingSchemeBuilder({ onSubmit, isSubmitting, errorMessage }: GradingSchemeBuilderProps) {
  type FormValues = z.input<typeof createGradingSchemeRequest>;
  const [templateId, setTemplateId] = useState('standard-40-60');

  const form = useForm<FormValues>({
    resolver: zodResolver(createGradingSchemeRequest),
    defaultValues: {
      name: GRADING_SCHEME_TEMPLATES[0]?.label ?? '',
      continuousAssessmentWeight: GRADING_SCHEME_TEMPLATES[0]?.continuousAssessmentWeight ?? 40,
      examWeight: GRADING_SCHEME_TEMPLATES[0]?.examWeight ?? 60,
      passMark: GRADING_SCHEME_TEMPLATES[0]?.passMark ?? 40,
      gradeBands: GRADING_SCHEME_TEMPLATES[0]?.gradeBands ?? DEFAULT_GRADE_BANDS,
      isDefault: true,
    },
  });

  const caWeight = form.watch('continuousAssessmentWeight');
  const examWeight = form.watch('examWeight');
  const gradeBands = form.watch('gradeBands');
  const weightsValid = caWeight + examWeight === 100;

  useEffect(() => {
    form.setValue('examWeight', 100 - caWeight, { shouldValidate: true });
  }, [caWeight, form]);

  function applyTemplate(id: string) {
    const template = GRADING_SCHEME_TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    setTemplateId(id);
    form.reset({
      name: template.label,
      continuousAssessmentWeight: template.continuousAssessmentWeight,
      examWeight: template.examWeight,
      passMark: template.passMark,
      gradeBands: template.gradeBands,
      isDefault: true,
    });
  }

  function updateBand(index: number, patch: Partial<GradeBand>) {
    const next = gradeBands.map((band, i) => (i === index ? { ...band, ...patch } : band));
    form.setValue('gradeBands', next, { shouldValidate: true });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="px-1">
        <p className={ACADEMIC_UI.sectionLabel}>Grading scheme</p>
        <h2 className="mt-1 text-[1.625rem] font-extrabold tracking-tight text-neutral-900">
          New scheme
        </h2>
        <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-neutral-500">
          Set how continuous assessment and exam scores combine. Weights must total exactly 100% before
          you save.
        </p>
      </header>

      <Form {...form}>
        <form
          id="grading-scheme-form"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(createGradingSchemeRequest.parse(values));
          })}
          className="space-y-8"
        >
          <FormSubmitError message={errorMessage ?? null} />

          <Group title="Template" caption="Start from a preset — you can tweak everything after.">
            <div className="p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:rounded-xl sm:bg-neutral-100 sm:p-1">
                {GRADING_SCHEME_TEMPLATES.map((template) => {
                  const selected = templateId === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template.id)}
                      className={cn(
                        'rounded-xl px-4 py-3 text-left transition duration-200 sm:flex-1 sm:py-2.5 sm:text-center',
                        selected
                          ? 'bg-white shadow-sm ring-1 ring-neutral-200/80'
                          : 'bg-neutral-50 hover:bg-neutral-100/80 sm:bg-transparent sm:hover:bg-white/60',
                      )}
                    >
                      <span className="block text-[14px] font-semibold text-neutral-900">{template.label}</span>
                      <span className="mt-0.5 block text-[11px] font-medium text-neutral-500">
                        {template.continuousAssessmentWeight}/{template.examWeight} · pass {template.passMark}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Group>

          <Group title="Details">
            <Row label="Scheme name" hint="Shown in the gradebook and on report cards.">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="JSS Standard Term 1"
                        className={cn(smartInputClass, 'border-0 bg-neutral-50 ring-1 ring-neutral-200/70')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Row>

            <Row label="Pass mark" hint="Minimum total score to pass.">
              <FormField
                control={form.control}
                name="passMark"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          {...field}
                          inputMode="numeric"
                          className={cn(
                            smartInputClass,
                            'max-w-[7rem] border-0 bg-neutral-50 ring-1 ring-neutral-200/70',
                          )}
                          onChange={(e) =>
                            field.onChange(Number.parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)
                          }
                        />
                        <span className="text-[15px] font-medium text-neutral-400">%</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Row>

            <Row label="School default" hint="Applies to every class and subject — no per-class setup needed.">
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-end space-y-0">
                    <FormControl>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="size-5 rounded-md data-[state=checked]:bg-brand-600"
                        />
                        <span className="sr-only">Set as tenant default</span>
                      </label>
                    </FormControl>
                  </FormItem>
                )}
              />
            </Row>
          </Group>

          <Group title="Weight split" caption="Drag the handle or type percentages directly.">
            <div className="px-4 py-5 sm:px-5">
              <SchemeWeightSplit
                caWeight={caWeight}
                examWeight={examWeight}
                onChange={(ca, exam) => {
                  form.setValue('continuousAssessmentWeight', ca, { shouldValidate: true });
                  form.setValue('examWeight', exam, { shouldValidate: true });
                }}
              />
            </div>
          </Group>

          <Group title="Grade bands" caption="Define letter grades and score ranges for this scheme.">
            {gradeBands.map((band, index) => (
              <GradeBandRow key={`${band.grade}-${index}`} band={band} index={index} onChange={updateBand} />
            ))}
            <FormMessage>{form.formState.errors.gradeBands?.message}</FormMessage>
          </Group>

          <div className={cn(panelClass, 'p-4 sm:p-5')}>
            <p className="text-[12px] leading-relaxed text-neutral-500">
              Mark as school default to apply this scheme to all classes automatically for the open term.
            </p>
            <button
              type="submit"
              disabled={!weightsValid || isSubmitting}
              className={cn(
                ACADEMIC_UI.btnPrimary,
                'mt-4 h-12 w-full justify-center rounded-xl text-[15px] font-semibold shadow-sm',
              )}
            >
              {isSubmitting ? 'Saving…' : 'Save grading scheme'}
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
}
