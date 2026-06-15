'use client';

import {
  useCreateFeeStructure,
  useUpdateFeeStructure,
  useAmendFeeStructure,
} from '@loomis/api-client';
import {
  amendFeeStructureRequest,
  createFeeStructureRequest,
  feeItemCategory,
  updateFeeStructureRequest,
  type FeeItemCategory,
  type FeeStructureResponse,
} from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  CurrencyInput,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layers3, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  FormSubmitError,
  SmartFormPanel,
  SmartFormPanelHeader,
  SmartFormSection,
  smartInputClass,
} from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { financeErrorMessage } from '@/lib/finance/finance-errors';
import { formatFeeCategory } from '@/lib/finance/finance-labels';

const feeItemFormSchema = z.object({
  name: z.string().min(1).max(120),
  category: feeItemCategory,
  amountMinor: z.number().int().positive(),
});

const feeFormSchema = z.object({
  items: z.array(feeItemFormSchema).min(1).max(50),
});

const amendFormSchema = feeFormSchema.extend({
  justification: z.string().min(10).max(500),
});

type FeeFormValues = z.infer<typeof feeFormSchema>;
type AmendFormValues = z.infer<typeof amendFormSchema>;

const CATEGORY_OPTIONS = feeItemCategory.options;

interface FeeStructureEditorProps {
  tenantId: string;
  termId: string;
  yearId: string;
  classLevelId: string;
  classLevelLabel: string;
  termOpen: boolean;
  structure: FeeStructureResponse | null;
  isLoading: boolean;
  canEdit: boolean;
}

export function FeeStructureEditor({
  tenantId,
  termId,
  yearId,
  classLevelId,
  classLevelLabel,
  termOpen,
  structure,
  isLoading,
  canEdit,
}: FeeStructureEditorProps) {
  const [amendMode, setAmendMode] = useState(false);

  const createMutation = useCreateFeeStructure(tenantId, termId);
  const updateMutation = useUpdateFeeStructure(
    tenantId,
    termId,
    structure?.id ?? '00000000-0000-0000-0000-000000000000',
  );
  const amendMutation = useAmendFeeStructure(
    tenantId,
    termId,
    structure?.id ?? '00000000-0000-0000-0000-000000000000',
  );

  const defaultItems = useMemo(
    () =>
      structure?.items.map((item) => ({
        name: item.name,
        category: item.category,
        amountMinor: item.amountMinor,
      })) ?? [{ name: 'Tuition', category: 'tuition' as FeeItemCategory, amountMinor: 0 }],
    [structure],
  );

  const form = useForm<FeeFormValues>({
    resolver: zodResolver(feeFormSchema),
    defaultValues: { items: defaultItems },
  });

  const amendForm = useForm<AmendFormValues>({
    resolver: zodResolver(amendFormSchema),
    defaultValues: { items: defaultItems, justification: '' },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const amendFields = useFieldArray({ control: amendForm.control, name: 'items' });

  useEffect(() => {
    form.reset({ items: defaultItems });
    amendForm.reset({ items: defaultItems, justification: '' });
  }, [defaultItems, form, amendForm]);

  const watchedItems = form.watch('items');
  const totalMinor = watchedItems.reduce((sum, item) => sum + (item.amountMinor || 0), 0);

  const readOnly = !canEdit || (termOpen && Boolean(structure)) || structure?.status === 'superseded';
  const canDirectEdit = canEdit && structure && !termOpen && structure.status !== 'superseded';
  const canCreate = canEdit && !structure;
  const canAmend = canEdit && termOpen && structure && structure.status === 'active';

  async function onSave(values: FeeFormValues) {
    try {
      if (structure && canDirectEdit) {
        const parsed = updateFeeStructureRequest.parse({ items: values.items });
        await updateMutation.mutateAsync(parsed);
      } else if (canCreate) {
        const parsed = createFeeStructureRequest.parse({
          academicYearId: yearId,
          termId,
          classLevelId,
          items: values.items,
        });
        await createMutation.mutateAsync(parsed);
      }
      form.clearErrors('root');
    } catch (error) {
      form.setError('root', { message: financeErrorMessage(error) });
    }
  }

  async function onAmend(values: AmendFormValues) {
    try {
      const parsed = amendFeeStructureRequest.parse(values);
      await amendMutation.mutateAsync(parsed);
      setAmendMode(false);
      amendForm.clearErrors('root');
    } catch (error) {
      amendForm.setError('root', { message: financeErrorMessage(error) });
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <SmartFormPanel
      header={
        <SmartFormPanelHeader
          icon={Layers3}
          title={classLevelLabel}
          subtitle="Fee structure for this class level (US-FIN-001). Amounts in Naira, stored as kobo."
          badge={
            structure ? (
              <Badge variant={structure.status === 'active' ? 'default' : 'outline'}>
                {structure.status} · v{structure.version}
              </Badge>
            ) : (
              <Badge variant="outline">Not configured</Badge>
            )
          }
        />
      }
    >
      <div className="space-y-4">
        {termOpen && structure ? (
          <Alert variant="warning">
            <AlertDescription>
              This term is open. Direct edits are locked — request a Principal-approved amendment.
            </AlertDescription>
          </Alert>
        ) : null}

        {structure?.lastAmendmentWorkflowId ? (
          <Alert>
            <AlertDescription>
              Amendment pending Principal approval. Structure remains unchanged until approved.
            </AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
              <table className="min-w-full text-left text-[13px]">
                <thead className={ACADEMIC_UI.tableHeader}>
                  <tr>
                    {['Fee item', 'Category', 'Amount', ...(canDirectEdit || canCreate ? [''] : [])].map((h) => (
                      <th
                        key={h || 'actions'}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className="border-t border-brand-50/80 align-top">
                      <td className="px-4 py-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.name`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...f} disabled={readOnly && !canCreate} className={smartInputClass} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.category`}
                          render={({ field: f }) => (
                            <FormItem>
                              <Select
                                value={f.value}
                                onValueChange={f.onChange}
                                disabled={readOnly && !canCreate}
                              >
                                <FormControl>
                                  <SelectTrigger className={smartInputClass}>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CATEGORY_OPTIONS.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {formatFeeCategory(cat)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.amountMinor`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormControl>
                                <CurrencyInput
                                  valueKobo={f.value}
                                  onChangeKobo={f.onChange}
                                  disabled={readOnly && !canCreate}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </td>
                      {canDirectEdit || canCreate ? (
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={fields.length <= 1}
                            onClick={() => remove(index)}
                            aria-label="Remove fee item"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-50/80 pt-4">
              <p className="font-mono text-sm tabular-nums text-neutral-800">
                Total ·{' '}
                <span className="font-extrabold">{formatKobo(totalMinor || structure?.totalAmountMinor || 0)}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(canDirectEdit || canCreate) && (
                  <>
                    <button
                      type="button"
                      className={ACADEMIC_UI.btnSecondarySm}
                      onClick={() => append({ name: '', category: 'other', amountMinor: 0 })}
                    >
                      <Plus className="size-4" />
                      Add item
                    </button>
                    <button
                      type="submit"
                      className={ACADEMIC_UI.btnPrimarySm}
                      disabled={createMutation.isSubmitting || updateMutation.isSubmitting}
                    >
                      {structure ? 'Save structure' : 'Create structure'}
                    </button>
                  </>
                )}
                {canAmend ? (
                  <button type="button" className={ACADEMIC_UI.btnSecondarySm} onClick={() => setAmendMode((v) => !v)}>
                    {amendMode ? 'Cancel amendment' : 'Request amendment'}
                  </button>
                ) : null}
              </div>
            </div>

            <FormSubmitError message={form.formState.errors.root?.message ?? null} />
          </form>
        </Form>

        {amendMode && canAmend ? (
          <SmartFormPanel
            className="mt-4 ring-1 ring-brand-200/60"
            header={
              <SmartFormPanelHeader
                title="Proposed amendment"
                subtitle="Submitted to Principal for approval — structure stays unchanged until approved."
              />
            }
          >
            <Form {...amendForm}>
              <form onSubmit={amendForm.handleSubmit(onAmend)} className="space-y-4">
                <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
                  <table className="min-w-full text-left text-[13px]">
                    <thead className={ACADEMIC_UI.tableHeader}>
                      <tr>
                        {['Fee item', 'Category', 'Amount'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {amendFields.fields.map((field, index) => (
                        <tr key={field.id} className="border-t border-brand-50/80 align-top">
                          <td className="px-4 py-3">
                            <FormField
                              control={amendForm.control}
                              name={`items.${index}.name`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input {...f} className={smartInputClass} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <FormField
                              control={amendForm.control}
                              name={`items.${index}.category`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <Select value={f.value} onValueChange={f.onChange}>
                                    <FormControl>
                                      <SelectTrigger className={smartInputClass}>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {CATEGORY_OPTIONS.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                          {formatFeeCategory(cat)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <FormField
                              control={amendForm.control}
                              name={`items.${index}.amountMinor`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormControl>
                                    <CurrencyInput valueKobo={f.value} onChangeKobo={f.onChange} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <SmartFormSection title="Justification" description="Required for Principal review">
                  <FormField
                    control={amendForm.control}
                    name="justification"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Why is this amendment required?"
                            className="rounded-xl border-neutral-200 bg-white text-[13px] focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SmartFormSection>

                <FormSubmitError message={amendForm.formState.errors.root?.message ?? null} />

                <button type="submit" className={ACADEMIC_UI.btnPrimary} disabled={amendMutation.isSubmitting}>
                  Submit for Principal approval
                </button>
              </form>
            </Form>
          </SmartFormPanel>
        ) : null}
      </div>
    </SmartFormPanel>
  );
}
