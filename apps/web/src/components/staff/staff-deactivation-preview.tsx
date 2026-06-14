'use client';

import type { StaffDetailResponse } from '@loomis/contracts';
import { AlertTriangle, BookOpen, Shield, Users } from 'lucide-react';
import {
  formatStaffDisplayRole,
  formatStaffExtensionLabels,
} from '@/lib/staff/staff-labels';
import { SEMANTIC } from '@/lib/design/surfaces';

interface DeactivationImpactPreviewProps {
  staff: StaffDetailResponse;
  className?: string;
}

export function DeactivationImpactPreview({ staff, className }: DeactivationImpactPreviewProps) {
  const subjectCount = staff.subjectAssignments.length;
  const classTeacherCount = staff.classTeacherAssignments.length;
  const roleCount = staff.roleExtensions.length + (staff.primaryRole ? 1 : 0);
  const assignmentCount = subjectCount + classTeacherCount;

  const hasImpact = assignmentCount > 0 || roleCount > 0;

  return (
    <div className={`card overflow-hidden rounded-2xl border-l-4 border-l-gold-500 ${className ?? ''}`}>
      {/* Header */}
      <div className={`flex items-start gap-3 border-b px-5 py-4 ${SEMANTIC.warning.surface}`}>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${SEMANTIC.warning.icon}`}>
          <AlertTriangle aria-hidden className="size-4" />
        </span>
        <div>
          <h3 className={`text-[13px] font-bold ${SEMANTIC.warning.title}`}>Impact Preview</h3>
          <p className={`mt-0.5 text-[12px] ${SEMANTIC.warning.text}`}>
            This action will deactivate <span className="font-semibold">{staff.fullName}</span>. Review what will be affected.
          </p>
        </div>
      </div>

      {/* Impact items */}
      <div className="p-5 space-y-3">
        {subjectCount > 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-brand-50 bg-brand-50/10 p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <BookOpen aria-hidden className="size-3.5" />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-neutral-800">
                {subjectCount} subject assignment{subjectCount > 1 ? 's' : ''}
              </p>
              <p className="text-[11px] text-neutral-500">
                Deactivating will end {subjectCount} active subject {subjectCount === 1 ? 'assignment' : 'assignments'}. A replacement teacher will need to be assigned.
              </p>
            </div>
          </div>
        ) : null}

        {classTeacherCount > 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-brand-50 bg-brand-50/10 p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-purple-100 text-accent-purple-600">
              <Users aria-hidden className="size-3.5" />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-neutral-800">
                {classTeacherCount} class teacher assignment{classTeacherCount > 1 ? 's' : ''}
              </p>
              <p className="text-[11px] text-neutral-500">
                {classTeacherCount} class{classTeacherCount > 1 ? 'es' : ''} will be without a designated class teacher. Assign replacements before or after deactivation.
              </p>
            </div>
          </div>
        ) : null}

        {roleCount > 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-brand-50 bg-brand-50/10 p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-700">
              <Shield aria-hidden className="size-3.5" />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-neutral-800">
                {roleCount} role{roleCount > 1 ? 's' : ''} revoked
              </p>
              <p className="text-[11px] text-neutral-500">
                Role assignments for{' '}
                <span className="font-medium text-neutral-700">
                  {(() => {
                    const extensions = formatStaffExtensionLabels(
                      staff.roleExtensions,
                      staff.primaryRole,
                    );
                    const roleLabel = formatStaffDisplayRole(staff.primaryRole, staff.roleExtensions);
                    return extensions ? `${roleLabel} + ${extensions}` : roleLabel;
                  })()}
                </span>{' '}
                will be deactivated. All active sessions will be revoked immediately.
              </p>
            </div>
          </div>
        ) : null}

        {!hasImpact ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 py-6">
            <p className="text-[12px] text-neutral-400">No active assignments or roles to revoke.</p>
          </div>
        ) : (
          <div className={`rounded-xl border p-3 ${SEMANTIC.warning.surfaceSubtle}`}>
            <p className={`text-[11px] font-medium ${SEMANTIC.warning.textStrong}`}>
              Historical records will be preserved. This action cannot be undone directly — only via reactivation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
