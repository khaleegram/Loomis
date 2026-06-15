import type { Role } from '@loomis/contracts';

export function isExamOfficerRole(
  role: Role | null | undefined,
): role is 'exam_officer' | 'deputy_exam_officer' {
  return role === 'exam_officer' || role === 'deputy_exam_officer';
}
