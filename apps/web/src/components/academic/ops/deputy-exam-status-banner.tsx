'use client';

import type { ExamOpsStatusResponse } from '@loomis/contracts';
import { Clock, ShieldCheck } from 'lucide-react';

import { SEMANTIC } from '@/lib/design/surfaces';

interface DeputyExamStatusBannerProps {
  status: ExamOpsStatusResponse | undefined;
  role: string | undefined;
  isLoading?: boolean;
}

/** Surfaces 72h Deputy Exam Officer activation + Principal emergency publish (Sprint 13). */
export function DeputyExamStatusBanner({ status, role, isLoading }: DeputyExamStatusBannerProps) {
  if (isLoading || !status?.deputyExamEnabled) return null;

  const isDeputy = role === 'deputy_exam_officer';
  const isExamStaff = role === 'exam_officer' || isDeputy;
  const isPrincipal = role === 'principal';

  if (isPrincipal && status.emergencyEscalationActive) {
    return (
      <div
        className={`flex gap-3 rounded-xl border px-4 py-3 shadow-sm ${SEMANTIC.warning.surface}`}
        role="alert"
      >
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-700" />
        <div>
          <p className={`text-[13px] font-bold ${SEMANTIC.warning.title}`}>Emergency publish active</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-gold-800/90">
            Exam staff have exceeded the SLA window. You may publish results from the Publish tab with
            authenticator step-up.
          </p>
        </div>
      </div>
    );
  }

  if (!isExamStaff) return null;

  if (status.deputyActivated) {
    if (!isDeputy) return null;
    return (
      <div
        className={`flex gap-3 rounded-xl border px-4 py-3 shadow-sm ${SEMANTIC.success.badge}`}
        role="status"
      >
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="text-[13px] font-bold text-emerald-900">Deputy Exam Officer is active</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-emerald-800/90">
            The Exam Officer has been inactive for 72+ hours. You may review corrections and publish
            when assigned.
          </p>
        </div>
      </div>
    );
  }

  if (isDeputy) {
    return (
      <div
        className={`flex gap-3 rounded-xl border px-4 py-3 shadow-sm ${SEMANTIC.warning.surface}`}
        role="alert"
      >
        <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-700" />
        <div>
          <p className={`text-[13px] font-bold ${SEMANTIC.warning.title}`}>
            Deputy access not yet active
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-gold-800/90">
            {status.hasExamOfficer
              ? `The Exam Officer must be inactive for 72 hours before you can act. About ${status.hoursUntilDeputyActivation} hour${status.hoursUntilDeputyActivation === 1 ? '' : 's'} remaining.`
              : 'No Exam Officer is assigned — contact the principal to assign coverage.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 text-[12px] text-neutral-600">
      Deputy Exam Officer activates automatically after 72 hours of Exam Officer inactivity.
    </div>
  );
}
