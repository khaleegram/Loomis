'use client';

import { Alert, AlertDescription } from '@loomis/ui-web';

import { CommsComposeClassMessage } from '@/components/comms/comms-compose-class-message';
import { useAcademicOpsContext } from '@/lib/academic/use-academic-ops-context';

interface CommsComposeStaffClassMessageProps {
  tenantId: string;
}

/** Class-wide parent messaging for principals, exam officers, and other staff (not class teachers). */
export function CommsComposeStaffClassMessage({ tenantId }: CommsComposeStaffClassMessageProps) {
  const ctx = useAcademicOpsContext(tenantId);
  const messagingTermId =
    ctx.isHistoricalView && ctx.openTerm?.id ? ctx.openTerm.id : ctx.termId;

  return (
    <div className="space-y-4">
      {ctx.isHistoricalView ? (
        <Alert>
          <AlertDescription>
            You are viewing a past term in the session bar. Parent messages always use the{' '}
            <strong>{ctx.openTerm?.name ?? 'current'}</strong> term so families with active
            enrollments receive them.
          </AlertDescription>
        </Alert>
      ) : null}
      <CommsComposeClassMessage
        tenantId={tenantId}
        ctx={{
          arms: ctx.arms,
          levels: ctx.levels,
          termId: messagingTermId,
          classArmId: ctx.classArmId,
          setClassArmId: ctx.setClassArmId,
        }}
      />
    </div>
  );
}
