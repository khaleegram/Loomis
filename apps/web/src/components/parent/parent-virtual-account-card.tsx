'use client';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { Building2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ParentVirtualAccountCardProps {
  accountNumber: string;
  bankName: string;
  accountName: string;
  childName: string;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function ParentVirtualAccountCard({
  accountNumber,
  bankName,
  accountName,
  childName,
}: ParentVirtualAccountCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function handleCopy(field: string, value: string) {
    const ok = await copyText(value);
    if (ok) {
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    }
  }

  return (
    <div className={ACADEMIC_UI.dataPanel}>
      <div className="border-b border-border bg-gradient-to-r from-brand-50/60 to-neutral-50 px-4 py-4 sm:px-5">
        <p className="flex items-center gap-2 text-[14px] font-bold text-neutral-900">
          <Building2 className="size-4 text-brand-600" aria-hidden />
          Pay by bank transfer
        </p>
        <p className="mt-1 text-[12px] text-neutral-600">
          Dedicated account for {childName}. Transfer from any Nigerian bank — we apply it automatically.
        </p>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-xl border border-brand-100/50 bg-brand-50/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Account number</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="font-mono text-lg font-bold tracking-wide text-neutral-900">{accountNumber}</p>
            <button
              type="button"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              onClick={() => void handleCopy('number', accountNumber)}
              aria-label="Copy account number"
            >
              {copiedField === 'number' ? (
                <Check className="size-4 text-accent-green-700" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Bank</p>
            <p className="mt-1 text-[13px] font-medium text-neutral-900">{bankName}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Account name</p>
            <p className="mt-1 text-[13px] font-medium text-neutral-900">{accountName}</p>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-neutral-500">
          Send any amount. Partial payments reduce the balance; extra is saved as fee credit for future terms.
          Refresh this page after transferring to see your updated balance.
        </p>
      </div>
    </div>
  );
}
