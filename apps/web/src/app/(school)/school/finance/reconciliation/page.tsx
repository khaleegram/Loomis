'use client';

import { useState } from 'react';
import type { ReconciliationExceptionResponse } from '@loomis/contracts';
import { useReconciliationExceptions, useResolveReconciliationException } from '@loomis/api-client';
import {
  Alert,
  AlertDescription,
  Badge,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Sheet,
  SheetContent,
  Skeleton,
  Textarea,
} from '@loomis/ui-web';
import { CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { FinanceReconciliationHero } from '@/components/finance/finance-reconciliation-hero';
import { PageBody } from '@/components/school/school-shell';
import {
  FormSubmitError,
  SmartFormFooter,
  SmartFormHeader,
  SmartFormSection,
} from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { useCan } from '@/lib/auth/use-capability';

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

const resolveSchema = z.object({
  resolutionNotes: z.string().min(10, 'Provide resolution notes (min 10 characters)'),
});

type ResolveForm = z.infer<typeof resolveSchema>;

export default function ReconciliationPage() {
  const tenantId = useTenantId();
  const canResolve = useCan('payment.verify');
  const [activeException, setActiveException] = useState<ReconciliationExceptionResponse | null>(null);

  const { data, isLoading, isError, error } = useReconciliationExceptions(tenantId ?? '');
  const resolveMutation = useResolveReconciliationException(tenantId ?? '');

  const exceptions = data?.exceptions ?? [];
  const openCount = exceptions.filter((ex) => ex.status === 'open').length;
  const resolvedCount = exceptions.filter((ex) => ex.status === 'resolved').length;

  const form = useForm<ResolveForm>({
    resolver: zodResolver(resolveSchema),
    defaultValues: { resolutionNotes: '' },
  });

  async function onResolve(values: ResolveForm) {
    if (!activeException) return;
    try {
      await resolveMutation.mutateAsync({
        exceptionId: activeException.id,
        status: 'resolved',
        resolutionNotes: values.resolutionNotes,
      });
      setActiveException(null);
      form.reset();
    } catch {
      form.setError('root', { message: 'Resolution failed. Try again.' });
    }
  }

  if (!tenantId) {
    return (
      <PageBody className={pageClass}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-6">
        <FinanceReconciliationHero
          openCount={openCount}
          resolvedCount={resolvedCount}
          isLoading={isLoading}
        />

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        ) : exceptions.length === 0 ? (
          <div className={`${ACADEMIC_UI.dataPanel} flex flex-col items-center justify-center py-16 text-center`}>
            <div className="flex size-14 items-center justify-center rounded-full bg-accent-green-50">
              <CheckCircle2 aria-hidden className="size-7 text-accent-green-600" />
            </div>
            <p className="mt-4 text-[15px] font-semibold text-neutral-800">All payments reconciled</p>
            <p className="mt-1 text-[13px] text-neutral-500">No gateway exceptions pending review.</p>
          </div>
        ) : (
          <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
            <div className="border-b border-border/80 px-5 py-4">
              <p className={ACADEMIC_UI.sectionLabel}>Exception queue</p>
              <p className="mt-1 text-[14px] font-semibold text-neutral-900">
                {openCount} unresolved exception{openCount === 1 ? '' : 's'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={ACADEMIC_UI.tableHeader}>
                  <tr>
                    {['Type', 'Gateway ref', 'Detected', 'Status', ...(canResolve ? ['Action'] : [])].map((h) => (
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
                  {exceptions.map((ex) => (
                    <tr key={ex.id} className="border-t border-brand-50/80">
                      <td className="px-4 py-3 font-medium capitalize text-neutral-900">
                        {ex.exceptionType.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-neutral-600">
                        {ex.gatewayReference?.slice(0, 16) ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {new Date(ex.createdAt).toLocaleDateString('en-NG')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ex.status === 'open' ? 'warning' : 'default'}>{ex.status}</Badge>
                      </td>
                      {canResolve ? (
                        <td className="px-4 py-3">
                          {ex.status === 'open' ? (
                            <button
                              type="button"
                              className={ACADEMIC_UI.btnSecondarySm}
                              onClick={() => {
                                setActiveException(ex);
                                form.reset();
                              }}
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-[12px] text-neutral-400">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Sheet open={activeException != null} onOpenChange={(open) => !open && setActiveException(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SmartFormHeader
            surface="sheet"
            eyebrow="Reconciliation"
            title="Resolve exception"
            description={
              activeException
                ? `${activeException.exceptionType.replace(/_/g, ' ')} · ${activeException.gatewayReference?.slice(0, 16) ?? 'no ref'}`
                : undefined
            }
          />
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <Form {...form}>
              <form id="resolve-exception-form" className="space-y-5" onSubmit={form.handleSubmit(onResolve)}>
                <FormSubmitError message={form.formState.errors.root?.message ?? null} />
                <SmartFormSection
                  title="Resolution notes"
                  description="Document what was verified and how the mismatch was closed."
                >
                  <FormField
                    control={form.control}
                    name="resolutionNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            rows={4}
                            placeholder="Describe the investigation and resolution…"
                            className="rounded-xl border-neutral-200 bg-white text-[13px] focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SmartFormSection>
              </form>
            </Form>
          </div>
          <SmartFormFooter
            formId="resolve-exception-form"
            submitLabel="Mark resolved"
            pending={resolveMutation.isPending}
            onCancel={() => setActiveException(null)}
          />
        </SheetContent>
      </Sheet>
    </PageBody>
  );
}
