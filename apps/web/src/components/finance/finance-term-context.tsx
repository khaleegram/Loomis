'use client';

import { useAcademicTerms, useAcademicYears } from '@loomis/api-client';
import type { AcademicTermResponse, AcademicYearResponse } from '@loomis/contracts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@loomis/ui-web';
import { useMemo, useState } from 'react';

import { formatCalendarDate } from '@/lib/academic/term-labels';

function pickDefaultYear(years: AcademicYearResponse[]): AcademicYearResponse | null {
  return years.find((y) => y.status === 'active') ?? years.find((y) => y.status === 'draft') ?? years[0] ?? null;
}

function pickDefaultTerm(terms: AcademicTermResponse[]): AcademicTermResponse | null {
  return terms.find((t) => t.status === 'open') ?? terms.find((t) => t.status === 'draft') ?? terms[0] ?? null;
}

interface FinanceTermContextProps {
  tenantId: string;
  yearId: string | null;
  termId: string | null;
  onYearChange: (yearId: string) => void;
  onTermChange: (termId: string) => void;
}

export function FinanceTermContext({
  tenantId,
  yearId,
  termId,
  onYearChange,
  onTermChange,
}: FinanceTermContextProps) {
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const resolvedYearId = yearId ?? pickDefaultYear(years)?.id ?? null;

  const termsQuery = useAcademicTerms(tenantId, resolvedYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const resolvedTermId = termId ?? pickDefaultTerm(terms)?.id ?? null;

  const activeYear = years.find((y) => y.id === resolvedYearId) ?? null;
  const activeTerm = terms.find((t) => t.id === resolvedTermId) ?? null;

  const sortedYears = useMemo(
    () => [...years].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [years],
  );

  if (yearsQuery.isLoading) {
    return <Skeleton className="h-10 w-full max-w-xl" />;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        value={resolvedYearId ?? undefined}
        onValueChange={onYearChange}
      >
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="Academic year" />
        </SelectTrigger>
        <SelectContent>
          {sortedYears.map((year) => (
            <SelectItem key={year.id} value={year.id}>
              {year.label} ({year.status})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={resolvedTermId ?? undefined}
        onValueChange={onTermChange}
        disabled={!resolvedYearId || terms.length === 0}
      >
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="Term" />
        </SelectTrigger>
        <SelectContent>
          {terms.map((term) => (
            <SelectItem key={term.id} value={term.id}>
              {term.name} · {term.status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeYear && activeTerm ? (
        <p className="text-xs text-muted-foreground">
          {activeYear.label} · {activeTerm.name} ·{' '}
          {formatCalendarDate(activeTerm.startDate)} – {formatCalendarDate(activeTerm.endDate)}
        </p>
      ) : null}
    </div>
  );
}

export { pickDefaultTerm, pickDefaultYear };
