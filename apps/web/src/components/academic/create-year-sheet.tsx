'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAcademicYear } from '@loomis/api-client';
import { createAcademicYearRequest, type CreateAcademicYearRequest } from '@loomis/contracts';
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

interface CreateYearSheetProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (yearId: string) => void;
}

const TERM_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({
  value: String(n),
  label: `${n} ${n === 1 ? 'term' : 'terms'}`,
}));

const LABEL_PRESETS = ['2024/2025', '2025/2026', '2026/2027'];

export function CreateYearSheet({
  tenantId,
  open,
  onOpenChange,
  onCreated,
}: CreateYearSheetProps) {
  const createYear = useCreateAcademicYear(tenantId);

  const form = useForm<CreateAcademicYearRequest>({
    resolver: zodResolver(createAcademicYearRequest) as Resolver<CreateAcademicYearRequest>,
    defaultValues: {
      label: '',
      startDate: '',
      endDate: '',
      termCount: 3,
    },
  });

  const label = form.watch('label');
  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');
  const termCount = form.watch('termCount');

  const previewSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (startDate && endDate) parts.push(`${startDate} → ${endDate}`);
    if (termCount) parts.push(`${termCount} draft term${termCount === 1 ? '' : 's'}`);
    return parts.join(' · ') || 'Fill in dates to preview your calendar';
  }, [startDate, endDate, termCount]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const year = await createYear.mutateAsync(values);
      form.reset();
      onOpenChange(false);
      onCreated?.(year.id);
    } catch (err) {
      form.setError('root', { message: academicErrorMessage(err) });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SmartFormHeader
          eyebrow="Academic calendar"
          title="Create academic year"
          description="Sets up a draft year and empty terms. Activation is a separate step — you can still adjust dates before going live."
        />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <FormContextCard
            badge="Preview"
            title={label || 'New academic year'}
            subtitle={previewSubtitle}
          />

          <Form {...form}>
            <form id="create-year-form" onSubmit={onSubmit} className="mt-6 space-y-5">
              <section className="space-y-3">
                <SmartFieldLabel>Year label</SmartFieldLabel>
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
                <SmartFieldLabel>School year dates</SmartFieldLabel>
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
                        <SmartHint>First day of the year</SmartHint>
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
                        <SmartHint>Last day of the year</SmartHint>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <SmartFieldLabel>Terms per year</SmartFieldLabel>
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
                      <SmartHint>Most Nigerian schools use 3 terms — you can change this later only while in draft</SmartHint>
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
          formId="create-year-form"
          submitLabel="Create draft year"
          pending={createYear.isPending}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
