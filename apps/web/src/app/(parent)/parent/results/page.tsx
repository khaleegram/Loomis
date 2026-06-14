'use client';

import {
  useAcademicTerms,
  useAcademicYears,
  useMyResults,
  useParentDashboard,
  useParentResults,
} from '@loomis/api-client';
import type { ParentChildCardResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@loomis/ui-web';
import { useState } from 'react';

import { ChildResultsView } from '@/components/academic/ops/child-results-view';
import { PageBody } from '@/components/parent/parent-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { useAuth } from '@/lib/auth/auth-context';
import { useActiveTenantStore } from '@/lib/tenant/active-tenant-store';

function pickOpenTermId(terms: { id: string; status: string }[]): string | null {
  return (
    terms.find((term) => term.status === 'open')?.id ??
    terms.find((term) => term.status === 'census_locked')?.id ??
    terms[0]?.id ??
    null
  );
}

function StudentResultsView({ tenantId }: { tenantId: string }) {
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const resolvedTermId = termId ?? pickOpenTermId(terms);
  const resultsQuery = useMyResults(tenantId, resolvedTermId);

  return (
    <div className="space-y-4">
      {terms.length > 0 ? (
        <div className={`${ACADEMIC_UI.dataPanel} p-4 sm:max-w-xs`}>
          <Label className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">Term</Label>
          <Select value={resolvedTermId ?? ''} onValueChange={setTermId}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              {terms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <ChildResultsView
        title="Subject results"
        subtitle="Your published scores for this term."
        data={resultsQuery.data}
        isLoading={resultsQuery.isLoading}
        isError={resultsQuery.isError}
        errorMessage={resultsQuery.error ? academicErrorMessage(resultsQuery.error) : undefined}
      />
    </div>
  );
}

function ParentResultsView() {
  const dashboardQuery = useParentDashboard();
  const cards = dashboardQuery.data?.cards ?? [];
  const [selectedCard, setSelectedCard] = useState<ParentChildCardResponse | null>(null);
  const activeCard = selectedCard ?? cards[0] ?? null;

  const yearsQuery = useAcademicYears(activeCard?.tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(activeCard?.tenantId ?? '', activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const resolvedTermId = termId ?? pickOpenTermId(terms);

  const resultsQuery = useParentResults(
    activeCard?.tenantId ?? '',
    activeCard?.studentId ?? null,
    resolvedTermId,
  );

  if (dashboardQuery.isLoading) {
    return <Skeleton className="h-80 w-full rounded-2xl" />;
  }

  if (cards.length === 0) {
    return (
      <Alert>
        <AlertDescription>No linked children found on your dashboard.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${ACADEMIC_UI.dataPanel} grid gap-4 p-4 sm:grid-cols-2`}>
        <div className="space-y-2">
          <Label className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">Child</Label>
          <Select
            value={activeCard?.studentId ?? ''}
            onValueChange={(studentId) => {
              setSelectedCard(cards.find((card) => card.studentId === studentId) ?? null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {cards.map((card) => (
                <SelectItem key={card.studentId} value={card.studentId}>
                  {card.studentFirstName} · {card.schoolName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">Term</Label>
          <Select value={resolvedTermId ?? ''} onValueChange={setTermId}>
            <SelectTrigger>
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              {terms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ChildResultsView
        title="Subject results"
        subtitle={`Published scores for ${activeCard?.studentFirstName ?? 'your child'}.`}
        data={resultsQuery.data}
        isLoading={resultsQuery.isLoading}
        isError={resultsQuery.isError}
        errorMessage={resultsQuery.error ? academicErrorMessage(resultsQuery.error) : undefined}
      />
    </div>
  );
}

export default function ResultsPage() {
  const { session } = useAuth();
  const tenantId = useActiveTenantStore((s) => s.tenantId);
  const isStudent = session?.role === 'student';

  return (
    <PageBody className="max-w-[1100px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
      <div className="mb-6">
        <p className={ACADEMIC_UI.sectionLabel}>Report cards</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
          {isStudent ? 'My results' : "Child's results"}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Published term results from the school gradebook — US-PAR-003 / US-STU-001.
        </p>
      </div>

      {isStudent ? (
        tenantId ? (
          <StudentResultsView tenantId={tenantId} />
        ) : (
          <Alert>
            <AlertDescription>No school context. Sign in again.</AlertDescription>
          </Alert>
        )
      ) : (
        <ParentResultsView />
      )}
    </PageBody>
  );
}
