'use client';

import Link from 'next/link';
import { useAcademicTerms, useAcademicYears } from '@loomis/api-client';
import type { AcademicTermResponse, AcademicYearResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@loomis/ui-web';
import { useMemo, useState } from 'react';

import { ActivateYearDialog } from '@/components/academic/activate-year-dialog';
import { CloseTermDialog } from '@/components/academic/close-term-dialog';
import { CreateYearSheet } from '@/components/academic/create-year-sheet';
import { TermConfigPanel } from '@/components/academic/term-config-panel';
import { TermStatusBadge } from '@/components/academic/term-status-badge';
import { YearStatusBadge } from '@/components/academic/term-status-badge';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { formatCalendarDate } from '@/lib/academic/term-labels';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function SessionsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function pickDefaultYear(years: AcademicYearResponse[]): AcademicYearResponse | null {
  const active = years.find((y) => y.status === 'active');
  if (active) return active;
  const draft = years.find((y) => y.status === 'draft');
  if (draft) return draft;
  return years[0] ?? null;
}

function pickDefaultTerm(terms: AcademicTermResponse[]): AcademicTermResponse | null {
  const open = terms.find((t) => t.status === 'open');
  if (open) return open;
  const draft = terms.find((t) => t.status === 'draft');
  if (draft) return draft;
  return terms[0] ?? null;
}

export default function AcademicSessionsPage() {
  const tenantId = useTenantId();
  const canManageYear = useCan('academic_year.manage');
  const canManageTerm = useCan('term.manage');
  const canLockCensus = useCan('census.lock');
  const canView = useCanAny(['academic_year.manage', 'term.manage', 'census.lock']);

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];

  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [activateYear, setActivateYear] = useState<AcademicYearResponse | null>(null);
  const [closeTerm, setCloseTerm] = useState<AcademicTermResponse | null>(null);

  const activeYearId = selectedYearId ?? pickDefaultYear(years)?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId ?? '', activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const activeTermId = selectedTermId ?? pickDefaultTerm(terms)?.id ?? null;
  const activeYear = years.find((y) => y.id === activeYearId) ?? null;
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;

  const sortedYears = useMemo(
    () => [...years].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [years],
  );

  if (!canView) {
    return (
      <>
        <PageHeader title="Academic sessions" />
        <PageBody>
          <p className="text-sm text-muted-foreground">
            You do not have permission to manage academic sessions.
          </p>
        </PageBody>
      </>
    );
  }

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Academic sessions" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>No tenant context. Sign in again.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Academic sessions"
        description="Manage academic years, configure terms, and monitor the term lifecycle (US-ASM-001..004)."
        actions={
          canManageYear ? (
            <Button onClick={() => setCreateOpen(true)}>Create academic year</Button>
          ) : undefined
        }
      />
      <PageBody>
        {yearsQuery.isLoading ? <SessionsSkeleton /> : null}

        {yearsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>Failed to load academic years.</AlertDescription>
          </Alert>
        ) : null}

        {!yearsQuery.isLoading && years.length === 0 ? (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>No academic years yet</CardTitle>
              <CardDescription>
                Create your first academic year to begin configuring terms and opening the school
                calendar.
              </CardDescription>
            </CardHeader>
            {canManageYear ? (
              <CardContent>
                <Button onClick={() => setCreateOpen(true)}>Create academic year</Button>
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        {!yearsQuery.isLoading && years.length > 0 && activeYear ? (
          <div className="space-y-6">
            {/* Regent Ledger — year tabs */}
            <Tabs
              value={activeYearId ?? undefined}
              onValueChange={(id) => {
                setSelectedYearId(id);
                setSelectedTermId(null);
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <TabsList className="h-auto flex-wrap justify-start">
                  {sortedYears.map((year) => (
                    <TabsTrigger key={year.id} value={year.id} className="gap-2">
                      {year.label}
                      <YearStatusBadge status={year.status} />
                    </TabsTrigger>
                  ))}
                </TabsList>
                {canManageYear && activeYear.status === 'draft' ? (
                  <Button variant="outline" size="sm" onClick={() => setActivateYear(activeYear)}>
                    Activate year
                  </Button>
                ) : null}
              </div>

              {sortedYears.map((year) => (
                <TabsContent key={year.id} value={year.id} className="mt-4 space-y-4">
                  <Card className="border-brand-600/20 bg-card shadow-card dark:border-mint-500/20">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base font-serif">{year.label}</CardTitle>
                        <YearStatusBadge status={year.status} />
                      </div>
                      <CardDescription>
                        {formatCalendarDate(year.startDate)} — {formatCalendarDate(year.endDate)} ·{' '}
                        {year.termCount} terms
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>

            {/* Term selector + actions */}
            {termsQuery.isLoading ? <Skeleton className="h-24 w-full" /> : null}

            {terms.length === 0 && !termsQuery.isLoading ? (
              <Alert>
                <AlertDescription>
                  {activeYear.status === 'draft'
                    ? 'Activate this year to create draft term placeholders.'
                    : 'No terms found for this year.'}
                </AlertDescription>
              </Alert>
            ) : null}

            {terms.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {terms.map((term) => (
                    <div key={term.id} className="flex items-center gap-1.5">
                      <Button
                        variant={term.id === activeTermId ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTermId(term.id)}
                      >
                        {term.name}
                      </Button>
                      <TermStatusBadge status={term.status} />
                    </div>
                  ))}
                </div>

                {activeTerm ? (
                  <div className="space-y-4">
                    <TermConfigPanel
                      tenantId={tenantId}
                      yearId={activeYear.id}
                      term={activeTerm}
                    />

                    <div className="flex flex-wrap gap-2">
                      {activeTerm.status === 'open' && canLockCensus ? (
                        <Button variant="default" className="border-gold/40 bg-gold/10 text-foreground hover:bg-gold/20 dark:bg-gold/15" asChild>
                          <Link
                            href={`/school/sessions/census-lock?termId=${activeTerm.id}&yearId=${activeYear.id}`}
                          >
                            Lock enrollment census
                          </Link>
                        </Button>
                      ) : null}
                      {activeTerm.status === 'census_locked' && canManageTerm ? (
                        <Button variant="outline" onClick={() => setCloseTerm(activeTerm)}>
                          Close term
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </PageBody>

      <CreateYearSheet
        tenantId={tenantId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setSelectedYearId(id)}
      />

      {activateYear ? (
        <ActivateYearDialog
          tenantId={tenantId}
          year={activateYear}
          open={Boolean(activateYear)}
          onOpenChange={(open) => {
            if (!open) setActivateYear(null);
          }}
        />
      ) : null}

      {closeTerm && activeYear ? (
        <CloseTermDialog
          tenantId={tenantId}
          yearId={activeYear.id}
          term={closeTerm}
          open={Boolean(closeTerm)}
          onOpenChange={(open) => {
            if (!open) setCloseTerm(null);
          }}
        />
      ) : null}
    </>
  );
}
