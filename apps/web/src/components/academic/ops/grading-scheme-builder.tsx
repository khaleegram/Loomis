'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createGradingSchemeRequest, type CreateGradingSchemeRequest, type GradeBand } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WeightLedgerBar,
} from '@loomis/ui-web';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import {
  DEFAULT_GRADE_BANDS,
  GRADING_SCHEME_TEMPLATES,
} from '@/lib/academic/ops-labels';

interface GradingSchemeBuilderProps {
  onSubmit: (values: CreateGradingSchemeRequest) => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export function GradingSchemeBuilder({ onSubmit, isSubmitting, errorMessage }: GradingSchemeBuilderProps) {
  type FormValues = z.input<typeof createGradingSchemeRequest>;
  const form = useForm<FormValues>({
    resolver: zodResolver(createGradingSchemeRequest),
    defaultValues: {
      name: '',
      continuousAssessmentWeight: 40,
      examWeight: 60,
      passMark: 40,
      gradeBands: DEFAULT_GRADE_BANDS,
      isDefault: false,
    },
  });

  const caWeight = form.watch('continuousAssessmentWeight');
  const examWeight = form.watch('examWeight');
  const gradeBands = form.watch('gradeBands');
  const weightsValid = caWeight + examWeight === 100;

  useEffect(() => {
    form.setValue('examWeight', 100 - caWeight, { shouldValidate: true });
  }, [caWeight, form]);

  function applyTemplate(templateId: string) {
    const template = GRADING_SCHEME_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    form.reset({
      name: template.label,
      continuousAssessmentWeight: template.continuousAssessmentWeight,
      examWeight: template.examWeight,
      passMark: template.passMark,
      gradeBands: template.gradeBands,
      isDefault: false,
    });
  }

  function updateBand(index: number, patch: Partial<GradeBand>) {
    const next = gradeBands.map((band, i) => (i === index ? { ...band, ...patch } : band));
    form.setValue('gradeBands', next, { shouldValidate: true });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(createGradingSchemeRequest.parse(values));
        })}
        className="space-y-6"
      >
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Grading scheme builder</CardTitle>
            <CardDescription>
              Define CA and exam weights that must sum to exactly 100% before saving (US-ACA-001).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheme name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. JSS Standard Term 1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Start from template</FormLabel>
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADING_SCHEME_TEMPLATES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <WeightLedgerBar
                  continuousAssessmentWeight={caWeight}
                  examWeight={examWeight}
                  onChange={(ca, exam) => {
                    form.setValue('continuousAssessmentWeight', ca, { shouldValidate: true });
                    form.setValue('examWeight', exam, { shouldValidate: true });
                  }}
                />
                {!weightsValid ? (
                  <Alert variant="warning">
                    <AlertDescription>
                      Weights must total exactly 100% before this scheme can be saved.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <FormField
                  control={form.control}
                  name="passMark"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Pass mark (%)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="numeric"
                          onChange={(e) =>
                            field.onChange(Number.parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Set as tenant default scheme</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-sm border bg-muted/30 p-4 lg:col-span-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ledger summary
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">CA weight</dt>
                    <dd className="font-mono font-semibold tabular-nums">{caWeight}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Exam weight</dt>
                    <dd className="font-mono font-semibold tabular-nums">{examWeight}%</dd>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <dt className="font-medium">Total</dt>
                    <dd
                      className={`font-mono font-semibold tabular-nums ${
                        weightsValid ? 'text-brand-600 dark:text-mint-400' : 'text-destructive'
                      }`}
                    >
                      {caWeight + examWeight}%
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div>
              <FormLabel className="mb-2 block">Grade bands</FormLabel>
              <div className="overflow-x-auto rounded-sm border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grade</TableHead>
                      <TableHead>Min</TableHead>
                      <TableHead>Max</TableHead>
                      <TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeBands.map((band, index) => (
                      <TableRow key={`${band.grade}-${index}`}>
                        <TableCell>
                          <Input
                            value={band.grade}
                            onChange={(e) => updateBand(index, { grade: e.target.value })}
                            className="h-8 w-16 font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            inputMode="numeric"
                            value={band.minScore}
                            onChange={(e) =>
                              updateBand(index, {
                                minScore: Number.parseInt(e.target.value.replace(/\D/g, ''), 10) || 0,
                              })
                            }
                            className="h-8 w-20 font-mono tabular-nums"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            inputMode="numeric"
                            value={band.maxScore}
                            onChange={(e) =>
                              updateBand(index, {
                                maxScore: Number.parseInt(e.target.value.replace(/\D/g, ''), 10) || 0,
                              })
                            }
                            className="h-8 w-20 font-mono tabular-nums"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={band.remark ?? ''}
                            onChange={(e) => updateBand(index, { remark: e.target.value || null })}
                            className="h-8 min-w-[140px]"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <FormMessage>{form.formState.errors.gradeBands?.message}</FormMessage>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 border-t sm:flex-row sm:justify-between">
            {errorMessage ? (
              <Alert variant="destructive" className="flex-1">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">
                Published schemes are locked for the term — verify weights before saving.
              </p>
            )}
            <Button type="submit" disabled={!weightsValid || isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save grading scheme'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
