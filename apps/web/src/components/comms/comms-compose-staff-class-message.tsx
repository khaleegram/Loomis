'use client';

import { CommsComposeClassMessage } from '@/components/comms/comms-compose-class-message';
import { useAcademicOpsContext } from '@/lib/academic/use-academic-ops-context';

interface CommsComposeStaffClassMessageProps {
  tenantId: string;
}

/** Class-wide parent messaging for principals, exam officers, and other staff (not class teachers). */
export function CommsComposeStaffClassMessage({ tenantId }: CommsComposeStaffClassMessageProps) {
  const ctx = useAcademicOpsContext(tenantId);

  return (
    <CommsComposeClassMessage
      tenantId={tenantId}
      ctx={{
        arms: ctx.arms,
        levels: ctx.levels,
        termId: ctx.termId,
        classArmId: ctx.classArmId,
        setClassArmId: ctx.setClassArmId,
      }}
    />
  );
}
