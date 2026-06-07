// @ts-nocheck
'use client';

import { usePsfObligations } from '@loomis/api-client';
import { Badge, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@loomis/ui-web';
import { formatKobo } from '@loomis/core';

import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const STATUS_BADGE: Record<string, string> = {
  pending: 'warning',
  partially_settled: 'warning',
  settled: 'success',
  waived: 'neutral',
};

export default function PsfObligationsPage() {
  const tenantId = useTenantId();
  const { data, isLoading, isError, error } = usePsfObligations(tenantId ?? '');

  const obligations = (data as any)?.obligations ?? [];

  if (!tenantId) {
    return (
      <>
        <PageHeader title="PSF Obligations" />
        <PageBody><p className="text-sm text-destructive">No tenant context.</p></PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="PSF Obligations"
        description="Per-student fee obligations created at census lock — US-REV-001"
      />
      <PageBody>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <p className="text-sm text-destructive">{(error as Error).message ?? 'Failed to load PSF obligations.'}</p>
        ) : obligations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <p className="text-sm text-muted-foreground">No PSF obligations yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Obligations are created when the census is locked for a term.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {obligations.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.studentId?.slice(0, 8)}…</TableCell>
                  <TableCell className="font-mono text-xs">{o.termId?.slice(0, 8)}…</TableCell>
                  <TableCell className="tabular-nums font-medium">{formatKobo(o.amountMinor ?? 0)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[o.status] ?? 'default'}>{o.status?.replace(/_/g, ' ') ?? '—'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageBody>
    </>
  );
}
