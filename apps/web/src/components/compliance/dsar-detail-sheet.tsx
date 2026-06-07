'use client';

import { useCollectDsarData, useDsar, useRespondDsar, useUpdateDsar } from '@loomis/api-client';
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from '@loomis/ui-web';
import { format } from 'date-fns';

interface DsarDetailSheetProps {
  dsarId: string | null;
  onClose: () => void;
}

export function DsarDetailSheet({ dsarId, onClose }: DsarDetailSheetProps) {
  const { data: dsar, isLoading } = useDsar(dsarId ?? '');
  const updateDsar = useUpdateDsar(dsarId ?? '');
  const collect = useCollectDsarData(dsarId ?? '');
  const respond = useRespondDsar(dsarId ?? '');

  return (
    <Sheet open={Boolean(dsarId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-serif">DSAR Detail</SheetTitle>
          <SheetDescription>Review, collect data, and mark responded</SheetDescription>
        </SheetHeader>

        {isLoading || !dsar ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="mt-6 space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{dsar.status}</Badge>
              <span className="text-muted-foreground">
                {dsar.daysRemaining <= 0
                  ? 'Overdue'
                  : `${dsar.daysRemaining} days remaining`}
              </span>
            </div>

            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Requester</dt>
                <dd className="capitalize">{dsar.requesterType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Received</dt>
                <dd>{format(new Date(dsar.receivedAt), 'dd MMM yyyy')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Deadline</dt>
                <dd>{format(new Date(dsar.responseDeadlineAt), 'dd MMM yyyy')}</dd>
              </div>
            </dl>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Data categories
              </p>
              <ul className="mt-1 list-inside list-disc">
                {dsar.dataCategories.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              {dsar.status === 'received' ? (
                <Button
                  variant="outline"
                  disabled={updateDsar.isPending}
                  onClick={() => updateDsar.mutate({ status: 'in_progress' })}
                >
                  Mark In Progress
                </Button>
              ) : null}
              {!dsar.hasDataPackage ? (
                <Button variant="outline" disabled={collect.isPending} onClick={() => collect.mutate()}>
                  Collect Data Package
                </Button>
              ) : (
                <p className="text-xs text-success">Data package ready for redaction review</p>
              )}
              {dsar.status === 'in_progress' && dsar.hasDataPackage ? (
                <Button disabled={respond.isPending} onClick={() => respond.mutate({})}>
                  Mark Responded
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
