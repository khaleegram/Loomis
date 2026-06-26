'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFinalizeSchoolYear, useSetupSchoolYear } from '@loomis/api-client';
import { setupSchoolYearRequest, type SetupSchoolYearRequest } from '@loomis/contracts';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Sheet,
  SheetContent,
  cn,
} from '@loomis/ui-web';
import { CalendarRange } from 'lucide-react';
import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

import {
  ChipOptionPicker,
  FormContextCard,
  SmartFieldLabel,
  SmartFormFooter,
  SmartFormHeader,
  SmartHint,
  smartInputClass,
} from '@/components/shared/smart-form';
import { academicErrorMessage } from '@/lib/academic/academic-errors';

interface SetupSchoolYearSheetProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (yearId: string) => void;
}

const TERM_COUNT_OPTIONS = [3, 2, 1].map((n) => ({
  value: String(n),
  label: `${n} ${n === 1 ? 'term' : 'terms'}`,
}));

const LABEL_PRESETS = ['2025/2026', '2026/2027', '2027/2028'];

/** Nigerian-friendly default: September start if we're before September, else current year Sept. */
function suggestYearDates(): { start: string; end: string; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;
  return {
    label: `${startYear}/${endYear}`,
    start: `${startYear}-09-01`,
    end: `${endYear}-07-31`,
  };
}

export function SetupSchoolYearSheet({
  tenantId,
  open,
  onOpenChange,
  onComplete,
}: SetupSchoolYearSheetProps) {
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
    if (!startDate || !endDate) return 'We will split your year into terms and start the current one automatically.';
    return `${termCount} terms · ${startDate} to ${endDate} · First Term goes live immediately`;
  }, [startDate, endDate, termCount]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await setup.mutateAsync(values);
      form.reset();
      onOpenChange(false);
      onComplete?.(result.academicYear.id);
    } catch (err) {
      form.setError('root', { message: academicErrorMessage(err) });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SmartFormHeader
          surface="sheet"
          eyebrow="School calendar"
          title="Start your school year"
          description="Tell us when your year runs. Loomis creates First, Second, and Third Term and opens the current one — no extra steps."
        />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <FormContextCard
            badge="What happens next"
            title={label || 'Your school year'}
            subtitle={previewSubtitle}
          />

          <Form {...form}>
            <form id="setup-school-year-form" onSubmit={onSubmit} className="mt-6 space-y-5">
              <section className="space-y-3">
                <SmartFieldLabel>School year name</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="2025/2026" className={smartInputClass} />
                      </FormControl>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {LABEL_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => form.setValue('label', preset, { shouldDirty: true })}
                            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600 transition hover:border-brand-200 hover:bg-brand-50/50"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="space-y-3">
                <SmartFieldLabel>When does the school year run?</SmartFieldLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <CalendarRange
                              aria-hidden
                              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                            />
                            <Input {...field} type="date" className={cn(smartInputClass, 'pl-9')} />
                          </div>
                        </FormControl>
                        <SmartHint>First day of school</SmartHint>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} type="date" className={smartInputClass} />
                        </FormControl>
                        <SmartHint>Last day of school</SmartHint>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <SmartFieldLabel>How many terms?</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="termCount"
                  render={({ field }) => (
                    <FormItem>
                      <ChipOptionPicker
                        options={TERM_COUNT_OPTIONS}
                        value={String(field.value)}
                        onChange={(v) => field.onChange(Number(v))}
                      />
                      <SmartHint>Most Nigerian schools use 3 — we split the dates evenly for you</SmartHint>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              {form.formState.errors.root ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
            </form>
          </Form>
        </div>

        <SmartFormFooter
          formId="setup-school-year-form"
          submitLabel="Start school year"
          pending={setup.isPending}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

interface FinalizeSchoolYearButtonProps {
  tenantId: string;
  yearId: string;
  yearLabel: string;
  onComplete?: () => void;
}

/** One-click finish for legacy draft years. */
export function FinalizeSchoolYearButton({
  tenantId,
  yearId,
  yearLabel,
  onComplete,
}: FinalizeSchoolYearButtonProps) {
  const finalize = useFinalizeSchoolYear(tenantId, yearId);

  return (
    <button
      type="button"
      disabled={finalize.isPending}
      onClick={async () => {
        try {
          await finalize.mutateAsync();
          onComplete?.();
        } catch {
          // parent can surface errors via query state
        }
      }}
      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#c9a96e] px-5 text-[14px] font-semibold text-neutral-900 shadow-sm transition hover:bg-[#b8956a] disabled:opacity-50"
    >
      {finalize.isPending ? 'Setting up…' : `Finish setup for ${yearLabel}`}
    </button>
  );
}
