'use client';

import {
  useAcknowledgeBreach,
  useBreach,
  useNdpcDraft,
  useRecordNdpcNotification,
} from '@loomis/api-client';
import {
  Alert,
  AlertDescription,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Textarea,
} from '@loomis/ui-web';
import { format } from 'date-fns';
import { useState } from 'react';

interface BreachDetailSheetProps {
  breachId: string | null;
  onClose: () => void;
}

export function BreachDetailSheet({ breachId, onClose }: BreachDetailSheetProps) {
  const { data: breach, isLoading } = useBreach(breachId ?? '');
  const { data: draft } = useNdpcDraft(breachId ?? '');
  const acknowledge = useAcknowledgeBreach(breachId ?? '');
  const recordNotification = useRecordNdpcNotification(breachId ?? '');
  const [outcome, setOutcome] = useState('');

  return (
    <Sheet open={Boolean(breachId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-serif">Breach Record</SheetTitle>
          <SheetDescription>Assess, acknowledge, and record NDPC notification</SheetDescription>
        </SheetHeader>

        {isLoading || !breach ? (
          <Skeleton className="mt-6 h-48 w-full" />
        ) : (
          <div className="mt-6 space-y-4 text-sm">
            <dl className="space-y-2 rounded-md border p-4">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Type</dt>
                <dd className="font-medium">{breach.breachType}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Likely cause</dt>
                <dd>{breach.likelyCause}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Containment</dt>
                <dd>{breach.containmentMeasures}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Discovered</dt>
                <dd>{format(new Date(breach.discoveredAt), 'dd MMM yyyy HH:mm')}</dd>
              </div>
            </dl>

            {!breach.acknowledgedAt ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Acknowledge breach to start NDPC clock</p>
                <Button
                  disabled={acknowledge.isPending}
                  onClick={() => acknowledge.mutate({ ndpcNotificationRequired: true })}
                >
                  Acknowledge &amp; Start 72h Clock
                </Button>
              </div>
            ) : null}

            {draft ? (
              <Alert>
                <AlertDescription>
                  <p className="font-semibold">NDPC draft ready</p>
                  <p className="mt-2 whitespace-pre-wrap text-xs">{draft.incidentSummary}</p>
                </AlertDescription>
              </Alert>
            ) : null}

            {breach.ndpcNotificationRequired && !breach.ndpcNotifiedAt ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Record NDPC notification outcome"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                />
                <Button
                  disabled={recordNotification.isPending || outcome.length < 3}
                  onClick={() => recordNotification.mutate({ outcome })}
                >
                  Record Notification Outcome
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
