// @ts-nocheck
'use client';

import { useState } from 'react';
import { useWorkflowInbox, useDecideWorkflow } from '@loomis/api-client';
import { Button, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@loomis/ui-web';
import { Check, X, Clock } from 'lucide-react';

import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function WorkflowInboxPage() {
  const tenantId = useTenantId();
  const [selectedStep, setSelectedStep] = useState<{ instanceId: string; stepId: string } | null>(null);

  const { data, isLoading, isError, error } = useWorkflowInbox(tenantId ?? '');

  const items = (data as any)?.items ?? [];

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Workflow Inbox" />
        <PageBody><p className="text-sm text-destructive">No tenant context.</p></PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Workflow Inbox"
        description="Pending approval tasks requiring your action — US-WRK-002"
      />
      <PageBody>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive" role="alert">
            {(error as Error).message ?? 'Failed to load workflow inbox.'}
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <p className="text-sm text-muted-foreground">No pending tasks.</p>
            <p className="mt-1 text-xs text-muted-foreground">Approval requests will appear here when workflows require your action.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Instance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.instance?.id ?? Math.random()}>
                  <TableCell className="font-medium">{item.instance?.workflowType ?? '—'}</TableCell>
                  <TableCell>{item.instance?.status ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.instance?.id?.slice(0, 8) ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {item.activeStep ? (
                      <StepActions
                        tenantId={tenantId}
                        item={item}
                        isSelected={selectedStep?.stepId === item.activeStep.id}
                        onToggle={(info) =>
                          setSelectedStep((s) =>
                            s?.stepId === info.stepId ? null : info,
                          )
                        }
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">No active step</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageBody>
    </>
  );
}

function StepActions({
  tenantId,
  item,
  isSelected,
  onToggle,
}: {
  tenantId: string;
  item: any;
  isSelected: boolean;
  onToggle: (info: { instanceId: string; stepId: string }) => void;
}) {
  const decide = useDecideWorkflow(tenantId, item.instance?.id, item.activeStep?.id);

  async function handleDecision(decision: 'approve' | 'reject') {
    try {
      await decide.mutateAsync({ decision });
      onToggle({ instanceId: item.instance?.id, stepId: item.activeStep?.id });
    } catch {
      // error handled by mutator
    }
  }

  if (isSelected) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="default" onClick={() => handleDecision('approve')} disabled={decide.isPending}>
          <Check className="mr-1 size-3.5" /> Approve
        </Button>
        <Button size="sm" variant="destructive" onClick={() => handleDecision('reject')} disabled={decide.isPending}>
          <X className="mr-1 size-3.5" /> Reject
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={() => onToggle({ instanceId: item.instance?.id, stepId: item.activeStep?.id })}>
      <Clock className="mr-1 size-3.5" /> Review
    </Button>
  );
}
