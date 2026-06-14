'use client';

import { useAcademicTerms, useAcademicYears, useStudentTermAttendance } from '@loomis/api-client';
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@loomis/ui-web';
import { useState } from 'react';

import { AttendanceTermView } from '@/components/academic/ops/attendance-term-view';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { studentDisplayName } from '@/lib/student/student-labels';

function pickOpenTermId(terms: { id: string; status: string; name: string }[]): {
  id: string | null;
  label: string | null;
} {
  const term =
    terms.find((row) => row.status === 'open') ??
    terms.find((row) => row.status === 'census_locked') ??
    terms[0];
  return term ? { id: term.id, label: term.name } : { id: null, label: null };
}

interface StudentAttendanceTabProps {
  tenantId: string;
  studentId: string;
  firstName: string;
  lastName: string;
}

export function StudentAttendanceTab({
  tenantId,
  studentId,
  firstName,
  lastName,
}: StudentAttendanceTabProps) {
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const resolved = termId ?? pickOpenTermId(terms).id;
  const termLabel = terms.find((t) => t.id === resolved)?.name ?? null;

  const attendanceQuery = useStudentTermAttendance(tenantId, studentId, resolved);

  return (
    <div className="space-y-4">
      {terms.length > 0 ? (
        <div className={`${ACADEMIC_UI.dataPanel} p-4 sm:max-w-xs`}>
          <Label className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">Term</Label>
          <Select value={resolved ?? ''} onValueChange={setTermId}>
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
        title={studentDisplayName(firstName, lastName)}
        subtitle="Term-by-term attendance history for this student."
        classArmLabel={attendanceQuery.data?.classArmLabel ?? null}
        termLabel={termLabel}
        records={attendanceQuery.data?.records ?? []}
        summary={attendanceQuery.data?.summary ?? { present: 0, absent: 0, late: 0, excused: 0 }}
        isLoading={attendanceQuery.isLoading || yearsQuery.isLoading || termsQuery.isLoading}
      />
    </div>
  );
}
