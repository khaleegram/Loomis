'use client';

import {
  useAcademicTerms,
  useAcademicYears,
  useParentDashboard,
  useParentTimetable,
  useStudentTimetable,
} from '@loomis/api-client';
import type { ParentChildCardResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@loomis/ui-web';
import { useEffect, useMemo, useState } from 'react';

import { TimetableWeekGrid } from '@/components/academic/ops/timetable-week-grid';
import { TimetableHero } from '@/components/academic/ops/timetable-hero';
import { PageBody } from '@/components/parent/parent-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useAuth } from '@/lib/auth/auth-context';
import { useActiveTenantStore } from '@/lib/tenant/active-tenant-store';
import { useBellScheduleSlots } from '@/lib/timetable/use-bell-schedule-slots';

function pickOpenTermId(terms: { id: string; status: string }[]): string | null {
  return (
    terms.find((term) => term.status === 'open')?.id ??
    terms.find((term) => term.status === 'census_locked')?.id ??
    terms[0]?.id ??
    null
  );
}

function StudentTimetableView({ tenantId }: { tenantId: string }) {
  const setActiveTenantId = useActiveTenantStore((s) => s.setActiveTenantId);

  useEffect(() => {
    setActiveTenantId(tenantId);
  }, [tenantId, setActiveTenantId]);

  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = useMemo(
    () => years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null,
    [years],
  );

  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const resolvedTermId = termId ?? pickOpenTermId(terms);

  const { scheduleSlots } = useBellScheduleSlots(tenantId, activeYearId);
  const timetableQuery = useStudentTimetable(tenantId, resolvedTermId ?? '');
  const entries = timetableQuery.data?.entries ?? [];
  const classLabel = timetableQuery.data?.classArmLabel;
  const termLabel = terms.find((t) => t.id === resolvedTermId)?.name ?? null;

  return (
    <>
      <TimetableHero
        canManage={false}
        classLabel={classLabel ?? null}
        termLabel={termLabel}
        lessonCount={entries.length}
        isLoading={timetableQuery.isLoading}
      />
      <div className="space-y-6">
      {yearsQuery.isLoading || termsQuery.isLoading ? (
        <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
      ) : terms.length > 0 ? (
        <div className={`${ACADEMIC_UI.dataPanel} grid gap-4 p-4 sm:grid-cols-2 sm:p-5`}>
          <div className="space-y-2">
            <Label className={ACADEMIC_UI.sectionLabel}>Term</Label>
            <Select value={resolvedTermId ?? undefined} onValueChange={(value) => setTermId(value)}>
              <SelectTrigger className="w-full">
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
      ) : null}

      {timetableQuery.isError ? (
        <Alert>
          <AlertDescription>
            No timetable available for this term yet. Check back after your school publishes the
            schedule.
          </AlertDescription>
        </Alert>
      ) : (
        <div className={`${ACADEMIC_UI.dataPanel} p-4 sm:p-5`}>
          <TimetableWeekGrid
            entries={entries}
            scheduleSlots={scheduleSlots}
            isLoading={timetableQuery.isLoading}
            showTermStructure
            emptyMessage="No published periods for this term yet."
          />
        </div>
      )}
      </div>
    </>
  );
}

function ParentTimetableView() {
  const setActiveTenantId = useActiveTenantStore((s) => s.setActiveTenantId);
  const dashboardQuery = useParentDashboard(true);
  const cards = dashboardQuery.data?.cards ?? [];
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const activeCard: ParentChildCardResponse | null = useMemo(() => {
    if (selectedStudentId) return cards.find((c) => c.studentId === selectedStudentId) ?? null;
    return cards[0] ?? null;
  }, [cards, selectedStudentId]);

  const tenantId = activeCard?.tenantId ?? null;

  useEffect(() => {
    if (tenantId) setActiveTenantId(tenantId);
  }, [tenantId, setActiveTenantId]);

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = useMemo(
    () => years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null,
    [years],
  );

  const termsQuery = useAcademicTerms(tenantId ?? '', activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const resolvedTermId = termId ?? pickOpenTermId(terms);

  const { scheduleSlots } = useBellScheduleSlots(tenantId, activeYearId);
  const timetableQuery = useParentTimetable(
    tenantId ?? '',
    activeCard?.studentId ?? '',
    resolvedTermId ?? '',
  );
  const entries = timetableQuery.data?.entries ?? [];
  const classLabel = timetableQuery.data?.classArmLabel ?? activeCard?.classArmLabel;
  const termLabel = terms.find((t) => t.id === resolvedTermId)?.name ?? null;

  if (dashboardQuery.isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  if (!activeCard) {
    return (
      <Alert>
        <AlertDescription>
          No linked children found. Ask your school administrator to link your account.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <TimetableHero
        canManage={false}
        classLabel={classLabel ?? null}
        termLabel={termLabel}
        lessonCount={entries.length}
        isLoading={timetableQuery.isLoading}
      />
      <div className="space-y-6">
      {cards.length > 1 ? (
        <div className={`${ACADEMIC_UI.dataPanel} grid gap-4 p-4 sm:grid-cols-2 sm:p-5`}>
          <div className="space-y-2">
            <Label className={ACADEMIC_UI.sectionLabel}>Child</Label>
            <Select
              value={activeCard.studentId}
              onValueChange={(value) => setSelectedStudentId(value)}
            >
              <SelectTrigger className="w-full">
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
          {terms.length > 0 ? (
            <div className="space-y-2">
              <Label className={ACADEMIC_UI.sectionLabel}>Term</Label>
              <Select value={resolvedTermId ?? undefined} onValueChange={(value) => setTermId(value)}>
                <SelectTrigger className="w-full">
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
        </div>
      ) : yearsQuery.isLoading || termsQuery.isLoading ? (
        <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
      ) : terms.length > 0 ? (
        <div className={`${ACADEMIC_UI.dataPanel} p-4 sm:p-5`}>
          <div className="space-y-2">
            <Label className={ACADEMIC_UI.sectionLabel}>Term</Label>
            <Select value={resolvedTermId ?? undefined} onValueChange={(value) => setTermId(value)}>
              <SelectTrigger className="max-w-md">
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
      ) : null}

      {timetableQuery.isError ? (
        <Alert>
          <AlertDescription>
            No timetable available for this term yet. Check back after the school publishes the
            schedule.
          </AlertDescription>
        </Alert>
      ) : (
        <div className={`${ACADEMIC_UI.dataPanel} p-4 sm:p-5`}>
          <TimetableWeekGrid
            entries={entries}
            scheduleSlots={scheduleSlots}
            isLoading={timetableQuery.isLoading}
            showTermStructure
            emptyMessage="No published periods for this term yet."
          />
        </div>
      )}
      </div>
    </>
  );
}

export default function ParentTimetablePage() {
  const { session } = useAuth();
  const isStudent = session?.role === 'student';
  const studentTenantId = session?.tenantId ?? null;

  return (
    <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      {isStudent ? (
        studentTenantId ? (
          <StudentTimetableView tenantId={studentTenantId} />
        ) : (
          <Alert>
            <AlertDescription>
              Your school account is not linked to a tenant. Contact your administrator.
            </AlertDescription>
          </Alert>
        )
      ) : (
        <ParentTimetableView />
      )}
    </PageBody>
  );
}
