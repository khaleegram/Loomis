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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CurrencyInput,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

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
    <Card className="shadow-card">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{classLevelLabel}</CardTitle>
          <CardDescription>
            Fee structure for this class level (US-FIN-001). Amounts entered in Naira, stored as
            kobo.
          </CardDescription>
        </div>
        {structure ? (
          <Badge variant={structure.status === 'active' ? 'default' : 'outline'}>
            {structure.status} · v{structure.version}
          </Badge>
        ) : (
          <Badge variant="outline">Not configured</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-48">Amount</TableHead>
                  {canDirectEdit || canCreate ? <TableHead className="w-12" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`items.${index}.name`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...f} disabled={readOnly && !canCreate} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell>
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
                                <SelectTrigger>
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
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    {canDirectEdit || canCreate ? (
                      <TableCell>
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
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="font-mono text-sm tabular-nums text-foreground">
                Total · <span className="font-semibold">{formatKobo(totalMinor || structure?.totalAmountMinor || 0)}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(canDirectEdit || canCreate) && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({ name: '', category: 'other', amountMinor: 0 })
                      }
                    >
                      <Plus className="mr-1 size-4" />
                      Add item
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={createMutation.isSubmitting || updateMutation.isSubmitting}
                    >
                      {structure ? 'Save structure' : 'Create structure'}
                    </Button>
                  </>
                )}
                {canAmend ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setAmendMode((v) => !v)}>
                    {amendMode ? 'Cancel amendment' : 'Request amendment'}
                  </Button>
                ) : null}
              </div>
            </div>

            {form.formState.errors.root ? (
              <Alert variant="destructive">
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            ) : null}
          </form>
        </Form>

        {amendMode && canAmend ? (
          <Form {...amendForm}>
            <form onSubmit={amendForm.handleSubmit(onAmend)} className="space-y-4 rounded-sm border border-gold/30 bg-gold/5 p-4 dark:bg-forest-900">
              <p className="text-sm font-medium text-foreground">Proposed amendment</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-48">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amendFields.fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={amendForm.control}
                          name={`items.${index}.name`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={amendForm.control}
                          name={`items.${index}.category`}
                          render={({ field: f }) => (
                            <FormItem>
                              <Select value={f.value} onValueChange={f.onChange}>
                                <FormControl>
                                  <SelectTrigger>
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
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <FormField
                control={amendForm.control}
                name="justification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justification</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Why is this amendment required?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {amendForm.formState.errors.root ? (
                <Alert variant="destructive">
                  <AlertDescription>{amendForm.formState.errors.root.message}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" disabled={amendMutation.isSubmitting}>
                Submit for Principal approval
              </Button>
            </form>
          </Form>
        ) : null}
      </CardContent>
    </Card>
  );
}
