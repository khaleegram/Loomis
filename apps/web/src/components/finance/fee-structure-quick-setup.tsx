'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { uuidv7 } from 'uuidv7';
import { z } from 'zod';
import {
  createFeeStructureRequest,
  feeItemCategory,
  updateFeeStructureRequest,
  type FeeItemCategory,
  type FeeStructureResponse,
} from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import { CurrencyInput, Form, FormControl, FormField, FormItem, FormMessage, Input } from '@loomis/ui-web';
import { CheckCircle2, Copy, Plus, Trash2, Wand2 } from 'lucide-react';
import { queryKeys, useApiClient } from '@loomis/api-client';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { financeErrorMessage } from '@/lib/finance/finance-errors';
import { formatFeeCategory } from '@/lib/finance/finance-labels';

type ClassLevelOption = {
  id: string;
  name: string;
};

const quickItemSchema = z.object({
  name: z.string().min(1, 'Enter a fee name').max(120),
  category: feeItemCategory,
  amountMinor: z.number().int().positive('Enter an amount'),
});

const quickSetupSchema = z.object({
  items: z.array(quickItemSchema).min(1).max(20),
});

type QuickSetupValues = z.infer<typeof quickSetupSchema>;

const COMMON_NIGERIAN_FEE_LINES: Array<{ name: string; category: FeeItemCategory; amountMinor: number }> = [
  { name: 'Tuition', category: 'tuition', amountMinor: 0 },
  { name: 'Development levy', category: 'development_levy', amountMinor: 0 },
  { name: 'Books', category: 'books', amountMinor: 0 },
  { name: 'Exam fees', category: 'exam', amountMinor: 0 },
];

function structureCanBeOverwritten(structure: FeeStructureResponse | undefined): boolean {
  return !structure || structure.status === 'draft';
}

export function FeeStructureQuickSetup({
  tenantId,
  termId,
  yearId,
  classLevels,
  structures,
  termOpen,
  canEdit,
}: {
  tenantId: string;
  termId: string;
  yearId: string;
  classLevels: ClassLevelOption[];
  structures: FeeStructureResponse[];
  termOpen: boolean;
  canEdit: boolean;
}) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const configuredCount = structures.length;
  const draftCount = structures.filter((structure) => structure.status === 'draft').length;
  const activeCount = structures.filter((structure) => structure.status === 'active').length;

  const form = useForm<QuickSetupValues>({
    resolver: zodResolver(quickSetupSchema),
    defaultValues: { items: COMMON_NIGERIAN_FEE_LINES },
  });
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = form.watch('items');
  const totalMinor = watchedItems.reduce((sum, item) => sum + (item.amountMinor || 0), 0);

  const applyAll = useMutation({
    mutationFn: async (values: QuickSetupValues) => {
      const results: Array<{ className: string; action: 'created' | 'updated' | 'skipped' }> = [];
      for (const level of classLevels) {
        const existing = structures.find((structure) => structure.classLevelId === level.id);
        if (!structureCanBeOverwritten(existing)) {
          results.push({ className: level.name, action: 'skipped' });
          continue;
        }

        if (existing) {
          const body = updateFeeStructureRequest.parse({ items: values.items });
          await client.request<FeeStructureResponse>(`/tenants/${tenantId}/fee-structures/${existing.id}`, {
            method: 'PUT',
            body,
            idempotencyKey: uuidv7(),
          });
          results.push({ className: level.name, action: 'updated' });
          continue;
        }

        const body = createFeeStructureRequest.parse({
          academicYearId: yearId,
          termId,
          classLevelId: level.id,
          items: values.items,
        });
        await client.post<FeeStructureResponse>(`/tenants/${tenantId}/fee-structures`, body, {
          idempotencyKey: uuidv7(),
        });
        results.push({ className: level.name, action: 'created' });
      }
      return results;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.all(tenantId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.finance.feeStructures(tenantId, termId),
      });
    },
  });

  const applyError = applyAll.error ? financeErrorMessage(applyAll.error) : null;
  const applySummary = applyAll.data
    ? {
        created: applyAll.data.filter((item) => item.action === 'created').length,
        updated: applyAll.data.filter((item) => item.action === 'updated').length,
        skipped: applyAll.data.filter((item) => item.action === 'skipped').length,
      }
    : null;

  if (!canEdit) return null;

  return (
    <section className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
      <div className="flex flex-col gap-4 border-b border-brand-100/40 bg-gradient-to-br from-brand-50/80 via-white to-white p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Fast Nigerian setup</p>
          <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
            Write the fee list once. Apply to every class.
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            This matches the usual school book: tuition, levies, books, exam fees. Apply it to all
            class levels, then adjust only the classes that are different below.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          <span className="rounded-xl border border-brand-100 bg-white px-3 py-2">
            <strong className="block text-base text-neutral-900">{configuredCount}</strong>
            configured
          </span>
          <span className="rounded-xl border border-brand-100 bg-white px-3 py-2">
            <strong className="block text-base text-neutral-900">{draftCount}</strong>
            editable
          </span>
          <span className="rounded-xl border border-brand-100 bg-white px-3 py-2">
            <strong className="block text-base text-neutral-900">{activeCount}</strong>
            locked
          </span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => applyAll.mutate(values))} className="space-y-4 p-5">
          {termOpen ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
              This term is already open. Existing active class fees stay locked; this assistant only
              fills missing or draft structures.
            </div>
          ) : null}

          <div className="grid gap-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded-xl border border-neutral-100 bg-white p-3 sm:grid-cols-[1.3fr_1fr_1fr_auto] sm:items-start">
                <FormField
                  control={form.control}
                  name={`items.${index}.name`}
                  render={({ field: input }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...input} placeholder="Fee name" className="h-10 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.category`}
                  render={({ field: input }) => (
                    <FormItem>
                      <FormControl>
                        <select
                          value={input.value}
                          onChange={input.onChange}
                          className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px]"
                        >
                          {feeItemCategory.options.map((category) => (
                            <option key={category} value={category}>
                              {formatFeeCategory(category)}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.amountMinor`}
                  render={({ field: input }) => (
                    <FormItem>
                      <FormControl>
                        <CurrencyInput valueKobo={input.value} onChangeKobo={input.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-200 px-3 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
                  disabled={fields.length <= 1}
                  onClick={() => remove(index)}
                  aria-label="Remove fee line"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-50 pt-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={ACADEMIC_UI.btnSecondarySm}
                onClick={() => replace(COMMON_NIGERIAN_FEE_LINES)}
              >
                <Wand2 aria-hidden className="size-4" />
                Nigerian template
              </button>
              <button
                type="button"
                className={ACADEMIC_UI.btnSecondarySm}
                onClick={() => append({ name: '', category: 'other', amountMinor: 0 })}
              >
                <Plus aria-hidden className="size-4" />
                Add line
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-sm text-neutral-700">
                Total per student: <strong>{formatKobo(totalMinor)}</strong>
              </p>
              <button type="submit" className={ACADEMIC_UI.btnPrimary} disabled={applyAll.isPending}>
                <Copy aria-hidden className="size-4" />
                {applyAll.isPending ? 'Applying...' : 'Apply to all classes'}
              </button>
            </div>
          </div>

          {applyError ? (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {applyError}
            </p>
          ) : null}

          {applySummary ? (
            <p className="inline-flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-[12px] font-semibold text-green-700">
              <CheckCircle2 aria-hidden className="size-4" />
              {applySummary.created} created, {applySummary.updated} updated, {applySummary.skipped} locked and skipped.
            </p>
          ) : null}
        </form>
      </Form>
    </section>
  );
}
