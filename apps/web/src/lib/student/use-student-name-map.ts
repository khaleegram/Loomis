import { useStudents } from '@loomis/api-client';
import type { ClassLevelResponse } from '@loomis/contracts';
import { useMemo } from 'react';

import { studentDisplayName } from '@/lib/student/student-labels';

export function useStudentNameMap(tenantId: string) {
  const studentsQuery = useStudents(tenantId);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of studentsQuery.data?.students ?? []) {
      map.set(student.id, studentDisplayName(student.firstName, student.lastName));
    }
    return map;
  }, [studentsQuery.data?.students]);

  const resolveStudentName = (studentId: string): string =>
    nameById.get(studentId) ?? 'Student';

  return {
    ...studentsQuery,
    nameById,
    resolveStudentName,
  };
}

export function buildClassLevelNameMap(levels: ClassLevelResponse[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const level of levels) {
    map.set(level.id, `${level.name} (${level.code})`);
  }
  return map;
}

export function resolveClassLevelName(
  classLevelId: string,
  levelById: Map<string, string>,
): string {
  return levelById.get(classLevelId) ?? 'Class';
}
