'use client';

import { useMemo } from 'react';
import { useSetupSchoolYear } from '@loomis/api-client';
import { setupSchoolYearRequest, type SetupSchoolYearRequest } from '@loomis/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage, Input } from '@loomis/ui-web';
import { ArrowRight } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';

import { ChipOptionPicker, FormContextCard, SmartFieldLabel, SmartHint } from '@/components/shared/smart-form';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { cn } from '@loomis/ui-web';

const TERM_COUNT_OPTIONS = [3, 2, 1].map((n) => ({
  value: String(n),
  label: `${n} ${n === 1 ? 'term' : 'terms'}`,
}));

const LABEL_PRESETS = ['2025/2026', '2026/2027', '2027/2028'];

function suggestYearDates(): { start: string; end: string; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;
  return { label: `${startYear}/${endYear}`, start: `${startYear}-09-01`, end: `${endYear}-07-31` };
}

interface SetupSchoolYearStepProps {
  tenantId: string;
  pending?: boolean;
  onComplete: (yearId: string) => void;
  onSkip: () => void;
}

export function SetupSchoolYearStep({ tenantId, onComplete, onSkip }: SetupSchoolYearStepProps) {
  const setup = useSetupSchoolYear(tenantId);
  const defaults = useMemo(() => suggestYearDates(), []);

  const form = useForm<SetupSchoolYearRequest>({
    resolver: zodResolver(setupSchoolYearRequest) as Resolver<SetupSchoolYearRequest>,
    defaultValues: {
      label: defaults.label,
      startDate: defaults.start,
      endDate: defaults.end,
      termCount: 3,
    },
  });

  const label = form.watch('label');
  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');
  const termCount = form.watch('termCount');

  const previewSubtitle = useMemo(() => {
    if (!startDate || !endDate) return 'We create your terms and open the current one automatically.';
    return `${termCount} terms · ${startDate} to ${endDate} · current term opens immediately`;
  }, [startDate, endDate, termCount]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await setup.mutateAsync(values);
      onComplete(result.academicYear.id);
    } catch (err) {
      form.setError('root', { message: academicErrorMessage(err) });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <p className={ACADEMIC_UI.sectionLabel}>Step 1</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
          When does your school year run?
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">
          One answer - Loomis creates First, Second, and Third Term and opens the current one. No
          draft, no activate, no open-term ceremony.
        </p>
      </div>

      <FormContextCard badge="What happens next" title={label || 'Your school year'} subtitle={previewSubtitle} />

      <Form {...form}>
        <form id="setup-school-year-step" onSubmit={onSubmit} className="space-y-5">
          <section className="space-y-3">
            <SmartFieldLabel>School year name</SmartFieldLabel>
            <div className="flex flex-wrap gap-2">
              {LABEL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => form.setValue('label', preset)}
                  className={cn(
                    'rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition',
                    label === preset
                      ? 'border-brand-400 bg-brand-50 text-brand-900'
                      : 'border-neutral-200 text-neutral-600 hover:border-brand-200',
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} placeholder="2025/2026" className="h-11 rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <SmartFieldLabel>Year starts</SmartFieldLabel>
                  <FormControl>
                    <Input {...field} type="date" className="h-11 rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <SmartFieldLabel>Year ends</SmartFieldLabel>
                  <FormControl>
                    <Input {...field} type="date" className="h-11 rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <section className="space-y-3">
            <SmartFieldLabel>How many terms?</SmartFieldLabel>
            <ChipOptionPicker
              options={TERM_COUNT_OPTIONS}
              value={String(termCount)}
              onChange={(v) => form.setValue('termCount', Number(v))}
            />
            <SmartHint>Most Nigerian schools use 3 terms. You can change this later.</SmartHint>
          </section>

          {form.formState.errors.root ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
              {form.formState.errors.root.message}
            </p>
          ) : null}
        </form>
      </Form>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onSkip} className="text-[13px] font-medium text-neutral-400 hover:text-neutral-600">
          Do this later
        </button>
        <button
          type="submit"
          form="setup-school-year-step"
          disabled={setup.isPending}
          className={cn(ACADEMIC_UI.btnPrimary, 'justify-center')}
        >
          {setup.isPending ? 'Starting…' : 'Start school year'}
          {!setup.isPending ? <ArrowRight aria-hidden className="size-4" /> : null}
        </button>
      </div>
    </div>
  );
}
