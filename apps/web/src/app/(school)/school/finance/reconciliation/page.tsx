// @ts-nocheck
'use client';

import { useState } from 'react';
import { useReconciliationExceptions, useResolveReconciliationException } from '@loomis/api-client';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Form, FormControl, FormField, FormItem, FormMessage, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@loomis/ui-web';
import { Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { useCan } from '@/lib/auth/use-capability';

const resolveSchema = z.object({
  resolutionNotes: z.string().min(10, 'Provide resolution notes (min 10 characters)'),
});

type ResolveForm = z.infer<typeof resolveSchema>;

export default function ReconciliationPage() {
  const tenantId = useTenantId();
  const canResolve = useCan('payment.verify');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useReconciliationExceptions(tenantId ?? '');
  const resolveMutation = useResolveReconciliationException(tenantId ?? '');

  const exceptions = (data as any)?.exceptions ?? [];

  const form = useForm<ResolveForm>({
    resolver: zodResolver(resolveSchema),
    defaultValues: { resolutionNotes: '' },
  });

  async function onResolve(exceptionId: string, values: ResolveForm) {
    try {
      await resolveMutation.mutateAsync({ status: 'resolved', resolutionNotes: values.resolutionNotes } as any);
      setResolvingId(null);
      form.reset();
    } catch { /* handled */ }
  }

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Reconciliation" />
        <PageBody><p className="text-sm text-destructive">No tenant context.</p></PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Payment Reconciliation" description="Review and resolve gateway reconciliation exceptions — US-FIN-007" />
      <PageBody>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : isError ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : exceptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Check className="mb-2 size-8 text-success" /> <p className="text-sm text-muted-foreground">All payments reconciled.</p>
          </div>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">{exceptions.length} Unresolved Exception{exceptions.length > 1 ? 's' : ''}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Gateway Ref</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead>Status</TableHead>
                    {canResolve ? <TableHead className="text-right">Action</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exceptions.map((ex: any) => (
                    <TableRow key={ex.id}>
                      <TableCell className="font-medium capitalize">{ex.exceptionType?.replace(/_/g, ' ') ?? '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{ex.gatewayReference?.slice(0, 12) ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{ex.createdAt ? new Date(ex.createdAt).toLocaleDateString() : '—'}</TableCell>
                      <TableCell><Badge variant={ex.status === 'open' ? 'warning' : 'success'}>{ex.status}</Badge></TableCell>
                      {canResolve ? (
                        <TableCell className="text-right">
                          {resolvingId === ex.id ? (
                            <Form {...form}>
                              <form onSubmit={form.handleSubmit((v) => onResolve(ex.id, v))} className="flex items-end gap-2">
                                <FormField control={form.control} name="resolutionNotes" render={({ field }) => (
                                  <FormItem className="flex-1"><FormControl><Textarea rows={2} placeholder="Resolution notes…" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="flex gap-1">
                                  <Button type="submit" size="sm" disabled={resolveMutation.isPending}>Resolve</Button>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => setResolvingId(null)}>Cancel</Button>
                                </div>
                              </form>
                            </Form>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => { setResolvingId(ex.id); form.setValue('resolutionNotes', ''); }}>Resolve</Button>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </PageBody>
    </>
  );
}
