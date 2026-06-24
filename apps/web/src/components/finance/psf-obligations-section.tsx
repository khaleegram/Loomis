'use client';

import { useAcademicTerms, useAcademicYears, usePsfObligations } from '@loomis/api-client';
import { formatKobo } from '@loomis/core';
import { Badge, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@loomis/ui-web';
import { useMemo } from 'react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatTermLabel } from '@/lib/academic/ops-labels';
import { useStudentNameMap } from '@/lib/student/use-student-name-map';

const STATUS_BADGE: Record<string, 'default' | 'warning' | 'success' | 'neutral'> = {
  pending: 'warning',
  partially_settled: 'warning',
  settled: 'success',
  waived: 'neutral',
};

function psfStatusVariant(status?: string): 'default' | 'warning' | 'success' | 'neutral' {
  if (!status) return 'default';
  return STATUS_BADGE[status] ?? 'default';
}

interface PsfObligationRow {
  id: string;
  studentId?: string;
  termId?: string;
  amountMinor?: number;
  status?: string;
}

/** Core PSF surface — section on balances, not top-level nav (Sprint 3). */
export function PsfObligationsSection({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError, error } = usePsfObligations(tenantId);
  const { resolveStudentName } = useStudentNameMap(tenantId);
  const yearsQuery = useAcademicYears(tenantId);
  const activeYearId =
    yearsQuery.data?.academicYears?.find((year) => year.status === 'active')?.id ??
    yearsQuery.data?.academicYears?.[0]?.id ??
    '';
  const termsQuery = useAcademicTerms(tenantId, activeYearId);
  const terms = termsQuery.data?.terms ?? [];

  const obligations = ((data as { obligations?: PsfObligationRow[] } | undefined)?.obligations ??
    []) as PsfObligationRow[];

  const termLabel = useMemo(
    () => (termId?: string) => (termId ? formatTermLabel(termId, terms) : '—'),
    [terms],
  );

  return (
    <section className={ACADEMIC_UI.dataPanel}>
      <div className="border-b border-brand-100/40 px-4 py-3 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
          Platform service fee
        </p>
        <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">Per-student charges</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Recorded automatically when Loomis bills your school each term. Read-only.
        </p>
      </div>

      <div className="overflow-x-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">{(error as Error).message ?? 'Failed to load PSF obligations.'}</p>
        ) : obligations.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nothing recorded yet. Charges appear after the automatic billing date for this term.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Term</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {obligations.slice(0, 10).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm font-medium">
                    {row.studentId ? resolveStudentName(row.studentId) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-700">{termLabel(row.termId)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatKobo(row.amountMinor ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={psfStatusVariant(row.status)}>
                      {row.status?.replace(/_/g, ' ') ?? '—'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}
