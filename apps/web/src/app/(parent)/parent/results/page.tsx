'use client';

import {
  useAcademicTerms,
  useAcademicYears,
  useMyProfile,
  useMyResults,
  useParentDashboard,
  useParentResults,
  useSchoolBranding,
} from '@loomis/api-client';
import type { ChildPublishedResultsResponse, ParentChildCardResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@loomis/ui-web';
import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ChildResultsView } from '@/components/academic/ops/child-results-view';
import { PublishedResultsReportCard } from '@/components/academic/ops/published-results-report-card';
import { ParentResultsHero } from '@/components/parent/parent-results-hero';
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

interface ResultsScopeProps {
  studentName: string;
  schoolName: string | null;
  termId: string | null;
  onTermChange: (termId: string) => void;
  terms: { id: string; name: string }[];
  yearsLoading: boolean;
  childSelector?: {
    cards: ParentChildCardResponse[];
    activeStudentId: string;
    onSelect: (studentId: string) => void;
  };
}

function ResultsScopePanel({
  studentName,
  schoolName,
  termId,
  onTermChange,
  terms,
  yearsLoading,
  childSelector,
}: ResultsScopeProps) {
  return (
    <div className={`${ACADEMIC_UI.dataPanel} grid gap-4 p-4 sm:grid-cols-2`} data-print-hide="true">
      {childSelector ? (
        <div className="space-y-2">
          <Label className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">Child</Label>
          <Select value={childSelector.activeStudentId} onValueChange={childSelector.onSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {childSelector.cards.map((card) => (
                <SelectItem key={card.studentId} value={card.studentId}>
                  {card.studentFirstName} · {card.schoolName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">Student</Label>
          <div className="flex h-10 items-center rounded-md border border-neutral-200 bg-neutral-50 px-3 text-[13px] font-medium text-neutral-800">
            {studentName}
            {schoolName ? <span className="ml-2 text-neutral-400">· {schoolName}</span> : null}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">Term</Label>
        {yearsLoading ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : terms.length > 0 ? (
          <Select value={termId ?? ''} onValueChange={onTermChange}>
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
        ) : (
          <p className="text-[13px] text-neutral-500">No terms available for this school yet.</p>
        )}
      </div>
    </div>
  );
}

function PublishedResultsSection({
  tenantId,
  studentName,
  data,
  sessionName,
}: {
  tenantId: string;
  studentName: string;
  data: ChildPublishedResultsResponse;
  sessionName: string | null;
}) {
  const brandingQuery = useSchoolBranding(tenantId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3" data-print-hide="true">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Report card</p>
          <p className="mt-1 text-[13px] text-neutral-600">
            Official term report — print or save as PDF from your browser.
          </p>
        </div>
        <Button type="button" className={ACADEMIC_UI.btnPrimarySm} onClick={() => window.print()}>
          <Printer aria-hidden className="size-4" />
          Print report card
        </Button>
      </div>

      <PublishedResultsReportCard
        studentName={studentName}
        schoolName={brandingQuery.data?.tenantName ?? null}
        logoStorageObjectId={brandingQuery.data?.branding.logoStorageObjectId}
        sessionName={sessionName}
        data={data}
      />
    </div>
  );
}

function StudentResultsView({ tenantId }: { tenantId: string }) {
  const profileQuery = useMyProfile();
  const brandingQuery = useSchoolBranding(tenantId);
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const sessionName = years.find((y) => y.id === activeYearId)?.label ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const resolvedTermId = termId ?? pickOpenTermId(terms);
  const termLabel = terms.find((t) => t.id === resolvedTermId)?.name ?? null;
  const resultsQuery = useMyResults(tenantId, resolvedTermId);

  const studentName = profileQuery.data?.displayName ?? 'Student';
  const schoolName = brandingQuery.data?.tenantName ?? null;
  const data = resultsQuery.data;
  const isLoading = yearsQuery.isLoading || termsQuery.isLoading || resultsQuery.isLoading || profileQuery.isLoading;

  return (
    <div className="space-y-6">
      <ParentResultsHero
        title="My results"
        description="Published term scores and your downloadable report card."
        studentName={studentName}
        schoolName={schoolName}
        classLabel={data?.classArmLabel ?? null}
        termLabel={termLabel}
        averageScore={data?.averageScore ?? null}
        subjectCount={data?.subjects.length ?? 0}
        published={Boolean(data?.published)}
        isLoading={isLoading}
      />

      <ResultsScopePanel
        studentName={studentName}
        schoolName={schoolName}
        termId={resolvedTermId}
        onTermChange={setTermId}
        terms={terms}
        yearsLoading={yearsQuery.isLoading || termsQuery.isLoading}
      />

      <ChildResultsView
        title="Subject breakdown"
        subtitle="Continuous assessment and exam scores for each subject."
        data={data}
        isLoading={resultsQuery.isLoading}
        isError={resultsQuery.isError}
        errorMessage={resultsQuery.error ? academicErrorMessage(resultsQuery.error) : undefined}
      />

      {data?.published ? (
        <PublishedResultsSection
          tenantId={tenantId}
          studentName={studentName}
          data={data}
          sessionName={sessionName}
        />
      ) : null}
    </div>
  );
}

function ParentResultsView() {
  const setActiveTenantId = useActiveTenantStore((s) => s.setActiveTenantId);
  const dashboardQuery = useParentDashboard();
  const cards = dashboardQuery.data?.cards ?? [];
  const [selectedCard, setSelectedCard] = useState<ParentChildCardResponse | null>(null);
  const activeCard = selectedCard ?? cards[0] ?? null;

  useEffect(() => {
    if (activeCard?.tenantId) {
      setActiveTenantId(activeCard.tenantId);
    }
  }, [activeCard?.tenantId, setActiveTenantId]);

  const yearsQuery = useAcademicYears(activeCard?.tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const sessionName = years.find((y) => y.id === activeYearId)?.label ?? null;
  const termsQuery = useAcademicTerms(activeCard?.tenantId ?? '', activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const resolvedTermId = termId ?? pickOpenTermId(terms);
  const termLabel = terms.find((t) => t.id === resolvedTermId)?.name ?? null;

  const resultsQuery = useParentResults(
    activeCard?.tenantId ?? '',
    activeCard?.studentId ?? null,
    resolvedTermId,
  );

  const data = resultsQuery.data;
  const isLoading =
    dashboardQuery.isLoading ||
    yearsQuery.isLoading ||
    termsQuery.isLoading ||
    resultsQuery.isLoading;

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
    <div className="space-y-6">
      <ParentResultsHero
        title="Child's results"
        description="Published term scores and the official report card for your selected child."
        studentName={activeCard?.studentFirstName ?? null}
        schoolName={activeCard?.schoolName ?? null}
        classLabel={data?.classArmLabel ?? activeCard?.classArmLabel ?? null}
        termLabel={termLabel}
        averageScore={data?.averageScore ?? null}
        subjectCount={data?.subjects.length ?? 0}
        published={Boolean(data?.published)}
        isLoading={isLoading}
      />

      <ResultsScopePanel
        studentName={activeCard?.studentFirstName ?? 'Student'}
        schoolName={activeCard?.schoolName ?? null}
        termId={resolvedTermId}
        onTermChange={setTermId}
        terms={terms}
        yearsLoading={yearsQuery.isLoading || termsQuery.isLoading}
        childSelector={{
          cards,
          activeStudentId: activeCard?.studentId ?? '',
          onSelect: (studentId) => {
            setSelectedCard(cards.find((card) => card.studentId === studentId) ?? null);
            setTermId(null);
          },
        }}
      />

      <ChildResultsView
        title="Subject breakdown"
        subtitle={`Continuous assessment and exam scores for ${activeCard?.studentFirstName ?? 'your child'}.`}
        data={data}
        isLoading={resultsQuery.isLoading}
        isError={resultsQuery.isError}
        errorMessage={resultsQuery.error ? academicErrorMessage(resultsQuery.error) : undefined}
      />

      {data?.published && activeCard ? (
        <PublishedResultsSection
          tenantId={activeCard.tenantId}
          studentName={activeCard.studentFirstName}
          data={data}
          sessionName={sessionName}
        />
      ) : null}
    </div>
  );
}

export default function ResultsPage() {
  const { session } = useAuth();
  const tenantId = useActiveTenantStore((s) => s.activeTenantId);
  const isStudent = session?.role === 'student';

  return (
    <PageBody className="max-w-[1100px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
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
