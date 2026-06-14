'use client';

import {
  useAcademicTerms,
  useAcademicYears,
  useMyAttendance,
  useParentAttendance,
  useParentDashboard,
} from '@loomis/api-client';
import type { ParentChildCardResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@loomis/ui-web';
import { useEffect, useState } from 'react';

import { AttendanceTermView } from '@/components/academic/ops/attendance-term-view';
import { PageBody } from '@/components/parent/parent-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
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

function StudentAttendanceView({ tenantId }: { tenantId: string }) {
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const resolvedTermId = termId ?? pickOpenTermId(terms);
  const termLabel = terms.find((t) => t.id === resolvedTermId)?.name ?? null;
  const attendanceQuery = useMyAttendance(tenantId, resolvedTermId);

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
      <AttendanceTermView
        title="My attendance"
        subtitle="Day-by-day record for the selected term. Contact your class teacher if anything looks wrong."
        classArmLabel={attendanceQuery.data?.classArmLabel ?? null}
        termLabel={termLabel}
        records={attendanceQuery.data?.records ?? []}
        summary={attendanceQuery.data?.summary ?? { present: 0, absent: 0, late: 0, excused: 0 }}
        isLoading={attendanceQuery.isLoading}
      />
    </div>
  );
}

function ParentAttendanceView() {
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
  const termLabel = terms.find((t) => t.id === resolvedTermId)?.name ?? null;

  const attendanceQuery = useParentAttendance(
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
        {terms.length > 0 ? (
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
        ) : null}
      </div>

      <AttendanceTermView
        title={activeCard?.studentFirstName ?? 'Child'}
        subtitle="Track daily presence for the selected term. Monthly summaries update when the class teacher submits roll call."
        classArmLabel={attendanceQuery.data?.classArmLabel ?? activeCard?.classArmLabel ?? null}
        termLabel={termLabel}
        records={attendanceQuery.data?.records ?? []}
        summary={attendanceQuery.data?.summary ?? { present: 0, absent: 0, late: 0, excused: 0 }}
        isLoading={attendanceQuery.isLoading}
      />
    </div>
  );
}

export default function AttendancePage() {
  const { session } = useAuth();
  const setActiveTenantId = useActiveTenantStore((s) => s.setActiveTenantId);
  const isStudent = session?.role === 'student';

  useEffect(() => {
    if (isStudent && session?.tenantId) {
      setActiveTenantId(session.tenantId);
    }
  }, [isStudent, session?.tenantId, setActiveTenantId]);

  return (
    <PageBody className="px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
      {isStudent && session?.tenantId ? (
        <StudentAttendanceView tenantId={session.tenantId} />
      ) : (
        <ParentAttendanceView />
      )}
    </PageBody>
  );
}
