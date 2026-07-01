'use client';

import { formatKobo } from '@loomis/core';
import { Alert, AlertDescription, Button } from '@loomis/ui-web';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { financeErrorMessage } from '@/lib/finance/finance-errors';

interface ParentHackathonResetPanelProps {
  childName: string;
  demoFeeMinor: number;
  isResetting: boolean;
  onReset: () => Promise<void>;
}

export function ParentHackathonResetPanel({
  childName,
  demoFeeMinor,
  isResetting,
  onReset,
}: ParentHackathonResetPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleReset() {
    setError(null);
    try {
      await onReset();
      setConfirming(false);
    } catch (err) {
      setError(financeErrorMessage(err));
    }
  }

  return (
    <section className="rounded-2xl border border-dashed border-amber-200/80 bg-amber-50/40 p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700/80">
        Hackathon sandbox
      </p>
      <h2 className="mt-1 text-base font-extrabold tracking-tight text-neutral-900">
        Reset demo balance
      </h2>
      <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-neutral-600">
        Clears payments and fee credit for {childName}, then sets the term invoice back to{' '}
        <strong className="text-neutral-900">{formatKobo(demoFeeMinor)}</strong> owed — ready for
        another Nomba sandbox transfer.
      </p>

      {error ? (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!confirming ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 border-amber-300/80 bg-white text-neutral-800 hover:bg-amber-50"
            onClick={() => setConfirming(true)}
            disabled={isResetting}
          >
            <RotateCcw className="mr-2 size-4" aria-hidden />
            Reset to {formatKobo(demoFeeMinor)} owed
          </Button>
        ) : (
          <>
            <Button
              type="button"
              className={`min-h-11 ${ACADEMIC_UI.btnPrimary}`}
              onClick={() => void handleReset()}
              disabled={isResetting}
            >
              {isResetting ? 'Resetting…' : 'Yes, reset balance'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => setConfirming(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
