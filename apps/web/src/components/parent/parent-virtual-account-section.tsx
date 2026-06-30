'use client';

import type { ParentFeeStatusResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';
import { RefreshCw } from 'lucide-react';

import { ParentVirtualAccountCard } from '@/components/parent/parent-virtual-account-card';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface ParentVirtualAccountSectionProps {
  fees: ParentFeeStatusResponse | undefined;
  childName: string;
  isLoading: boolean;
  onRetry: () => void;
  isRetrying: boolean;
}

export function ParentVirtualAccountSection({
  fees,
  childName,
  isLoading,
  onRetry,
  isRetrying,
}: ParentVirtualAccountSectionProps) {
  if (isLoading) {
    return <Skeleton className="h-52 w-full rounded-2xl" />;
  }

  if (!fees?.virtualAccountEnabled) {
    return null;
  }

  if (fees.virtualAccount) {
    return (
      <ParentVirtualAccountCard
        accountNumber={fees.virtualAccount.accountNumber}
        bankName={fees.virtualAccount.bankName}
        accountName={fees.virtualAccount.accountName}
        childName={childName}
      />
    );
  }

  return (
    <Alert className="border-amber-200 bg-amber-50/80">
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[13px] text-neutral-700">
          We could not load {childName}&apos;s dedicated bank account number yet. This is usually
          temporary — try again in a moment.
        </span>
        <button
          type="button"
          className={`${ACADEMIC_UI.btnSecondary} inline-flex shrink-0 items-center gap-2`}
          disabled={isRetrying}
          onClick={onRetry}
        >
          <RefreshCw className={`size-3.5 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden />
          {isRetrying ? 'Loading…' : 'Load account number'}
        </button>
      </AlertDescription>
    </Alert>
  );
}
