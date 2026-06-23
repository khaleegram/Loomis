import { describe, expect, it } from 'vitest';
import type { WorkflowInboxItemResponse } from '@loomis/contracts';

import { hrefForWorkflowItem } from './workflow-context-link';

function inboxItem(
  workflowType: WorkflowInboxItemResponse['instance']['workflowType'],
  subjectId?: string,
  payload: Record<string, unknown> = {},
): WorkflowInboxItemResponse {
  return {
    instance: {
      id: 'wf-1',
      tenantId: 'tenant-1',
      workflowType,
      status: 'pending',
      title: 'Test workflow',
      subjectType: 'student',
      subjectId: subjectId ?? null,
      payload,
      requestedById: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    activeStep: {
      id: 'step-1',
      sequence: 1,
      approverRole: 'principal',
      status: 'active',
    },
  } as WorkflowInboxItemResponse;
}

describe('hrefForWorkflowItem', () => {
  it('links student transfer to student profile', () => {
    expect(
      hrefForWorkflowItem(
        inboxItem('student_transfer_out', 'student-1', {
          destinationSchool: 'Other School',
        }),
      ),
    ).toBe('/school/students/student-1');
  });

  it('links held-back override to student profile', () => {
    expect(
      hrefForWorkflowItem(
        inboxItem('held_back_override', 'student-2', { heldBackReason: 'Low attendance' }),
      ),
    ).toBe('/school/students/student-2');
  });

  it('falls back to promotions when held-back has no subject', () => {
    expect(
      hrefForWorkflowItem(inboxItem('held_back_override', undefined, { heldBackReason: 'Reason' })),
    ).toBe('/school/academic/promotions');
  });

  it('links grade correction to exams corrections section', () => {
    expect(hrefForWorkflowItem(inboxItem('grade_correction'))).toBe(
      '/school/exams?section=corrections',
    );
  });
});
