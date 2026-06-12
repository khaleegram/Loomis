'use client';

import type { StaffPrimaryRole } from '@loomis/contracts';
import { AlertTriangle } from 'lucide-react';

import { formatRoleLabel } from '@/components/school/school-nav-config';
import { SEMANTIC } from '@/lib/design/surfaces';

interface StaffVacantRolesBannerProps {
  vacantRoles: StaffPrimaryRole[];
}

export function StaffVacantRolesBanner({ vacantRoles }: StaffVacantRolesBannerProps) {
  if (vacantRoles.length === 0) return null;

  const labels = vacantRoles.map((role) => formatRoleLabel(role));

  return (
    <div
      className={`flex gap-3 rounded-xl border px-4 py-3 shadow-sm ${SEMANTIC.warning.surface}`}
      role="alert"
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${SEMANTIC.warning.icon}`}>
        <AlertTriangle aria-hidden className="size-4" />
      </span>
      <div className="min-w-0">
        <p className={`text-[13px] font-bold ${SEMANTIC.warning.title}`}>
          Critical {vacantRoles.length === 1 ? 'role' : 'roles'} unassigned
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-gold-800/90">
          No active staff member currently holds{' '}
          {labels.length === 1 ? (
            <span className="font-semibold">{labels[0]}</span>
          ) : (
            <>
              {labels.slice(0, -1).join(', ')} or{' '}
              <span className="font-semibold">{labels[labels.length - 1]}</span>
            </>
          )}
          . Assign coverage or invite someone for {vacantRoles.length === 1 ? 'this role' : 'these roles'}{' '}
          as soon as possible — finance and exam workflows may be blocked.
        </p>
      </div>
    </div>
  );
}
