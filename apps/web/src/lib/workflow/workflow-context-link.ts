import type { WorkflowInboxItemResponse } from '@loomis/contracts';

function studentIdFromPayload(payload: Record<string, unknown>): string | null {
  const subjectId = payload.studentId;
  if (typeof subjectId === 'string' && subjectId.length > 0) return subjectId;
  return null;
}

/** Deep link from a workflow inbox item to its canonical review surface (§2.3). */
export function hrefForWorkflowItem(item: WorkflowInboxItemResponse): string | null {
  const payload = item.instance.payload ?? {};

  switch (item.instance.workflowType) {
    case 'staff_role_change':
      return item.instance.subjectId
        ? `/school/staff/${item.instance.subjectId}`
        : '/school/staff';
    case 'refund_request':
      return '/school/finance/refunds';
    case 'fee_structure_change':
      return '/school/workflows';
    case 'student_transfer_out': {
      const studentId = item.instance.subjectId ?? studentIdFromPayload(payload);
      return studentId ? `/school/students/${studentId}` : '/school/students';
    }
    case 'held_back_override': {
      const studentId = item.instance.subjectId ?? studentIdFromPayload(payload);
      if (studentId) return `/school/students/${studentId}`;
      return '/school/academic/promotions';
    }
    case 'grade_correction':
      return '/school/exams?section=corrections';
    case 'admission_decision':
      return '/school/students/admissions';
    case 'student_promotion_batch':
      return '/school/academic/promotions';
    default:
      return null;
  }
}
