import { useEffect, useState } from 'react';
import { useAcademicTerms, useAcademicYears } from '@loomis/api-client';
import { pickOpenTermId } from '@/lib/use-parent-child-context';

export function useParentTermScope(tenantId: string) {
  const [termId, setTermId] = useState<string | null>(null);

  useEffect(() => {
    setTermId(null);
  }, [tenantId]);

  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const resolvedTermId = termId ?? pickOpenTermId(terms);
  const termLabel = terms.find((t) => t.id === resolvedTermId)?.name ?? null;

  return {
    terms: terms.map((t) => ({ id: t.id, label: t.name })),
    termId: resolvedTermId,
    setTermId,
    termLabel,
    isLoading: !tenantId || yearsQuery.isLoading || termsQuery.isLoading,
    isError: yearsQuery.isError || termsQuery.isError,
  };
}
