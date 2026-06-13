'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useConfigureTerm, useOpenTerm } from '@loomis/api-client';
import {
  configureTermRequest,
  type AcademicTermResponse,
  type ConfigureTermRequest,
} from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Separator,
} from '@loomis/ui-web';
import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

import { OpenTermDialog } from '@/components/academic/open-term-dialog';
import { TermLifecycleTimeline } from '@/components/academic/term-lifecycle-timeline';
import { TermStatusBadge } from '@/components/academic/term-status-badge';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { defaultTermName, formatCalendarDate } from '@/lib/academic/term-labels';
import { useCan } from '@/lib/auth/use-capability';

interface TermConfigPanelProps {
  tenantId: string;
  yearId: string;
  term: AcademicTermResponse;
}

function toFormValues(term: AcademicTermResponse): ConfigureTermRequest {
  return {
    name: term.name || defaultTermName(term.sequence),
    startDate: term.startDate ?? '',
    endDate: term.endDate ?? '',
    enrollmentWindowOpenDate: term.enrollmentWindowOpenDate ?? '',
    enrollmentWindowCloseDate: term.enrollmentWindowCloseDate ?? '',
    censusLockDate: term.censusLockDate ?? '',
    examStartDate: term.examStartDate ?? undefined,
    examEndDate: term.examEndDate ?? undefined,
  };
}

/** Term Studio — grouped configuration cards for a draft/open term. */
export function TermConfigPanel({ tenantId, yearId, term }: TermConfigPanelProps) {
  const canManageTerm = useCan('term.manage');
  const configure = useConfigureTerm(tenantId, yearId, term.id);
  const openTerm = useOpenTerm(tenantId, yearId, term.id);
  const [openDialog, setOpenDialog] = useState(false);
  const isDraft = term.status === 'draft';
  const readOnly = !canManageTerm || !isDraft;

  const form = useForm<ConfigureTermRequest>({
    resolver: zodResolver(configureTermRequest) as Resolver<ConfigureTermRequest>,
    defaultValues: toFormValues(term),
  });

  useEffect(() => {
    form.reset(toFormValues(term));
  }, [term, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await configure.mutateAsync(values);
    } catch (err) {
      form.setError('root', { message: academicErrorMessage(err) });
    }
  });

  return (
    <div className="card rounded-2xl p-0">
      <div className="space-y-4 border-b border-neutral-100 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">{term.name}</h3>
            <p className="text-[13px] text-neutral-500">
              Term {term.sequence}
              {term.openedAt ? ` · Opened ${formatCalendarDate(term.openedAt.slice(0, 10))}` : null}
            </p>
          </div>
          <TermStatusBadge status={term.status} />
        </div>
        <TermLifecycleTimeline term={term} />
      </div>

      <div className="space-y-6 px-6 py-5">
        {term.status === 'open' ? (
          <Alert>
            <AlertDescription>
              This term is open. Configure dates before opening; use census lock when ready.
            </AlertDescription>
          </Alert>
        ) : null}

        {term.status !== 'draft' && term.status !== 'open' ? (
          <Alert>
            <AlertDescription>
              This term is {term.status.replace('_', ' ')}. Configuration is no longer available.
            </AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-6">
            <section className="space-y-4">
              <div className="border-l-2 border-brand-300 pl-3">
                <p className={ACADEMIC_UI.sectionLabel}>Calendar</p>
                <p className="text-[12px] text-neutral-500">Core term boundaries</p>
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Term name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={readOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" disabled={readOnly} />
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
                      <FormLabel>End date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <Separator className="bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            <section className="space-y-4">
              <div className="border-l-2 border-accent-teal-400 pl-3">
                <p className={ACADEMIC_UI.sectionLabel}>Enrollment window</p>
                <p className="text-[12px] text-neutral-500">
                  Must close on or before the census lock date
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="enrollmentWindowOpenDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Window opens</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enrollmentWindowCloseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Window closes</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="censusLockDate"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Census lock date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" disabled={readOnly} className="border-gold/40" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <Separator className="bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            <section className="space-y-4">
              <div className="border-l-2 border-accent-purple-400 pl-3">
                <p className={ACADEMIC_UI.sectionLabel}>Examinations</p>
                <p className="text-[12px] text-neutral-500">Optional — visible on the academic calendar</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="examStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exams start</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" disabled={readOnly} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exams end</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" disabled={readOnly} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {form.formState.errors.root ? (
              <Alert variant="destructive">
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            ) : null}

            {isDraft && canManageTerm ? (
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={configure.isPending} className={ACADEMIC_UI.btnPrimary}>
                  {configure.isPending ? 'Saving…' : 'Save configuration'}
                </button>
                <button
                  type="button"
                  disabled={openTerm.isPending}
                  onClick={() => setOpenDialog(true)}
                  className={ACADEMIC_UI.btnSecondary}
                >
                  Open term
                </button>
              </div>
            ) : null}
          </form>
        </Form>

        <OpenTermDialog
          term={term}
          open={openDialog}
          onOpenChange={setOpenDialog}
          isPending={openTerm.isPending}
          onConfirm={async () => {
            await openTerm.mutateAsync();
            setOpenDialog(false);
          }}
        />
      </div>
    </div>
  );
}
