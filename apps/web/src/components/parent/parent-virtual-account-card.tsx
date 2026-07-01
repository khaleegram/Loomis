'use client';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { Building2, Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface ParentVirtualAccountCardProps {
  accountNumber: string;
  bankName: string;
  accountName: string;
  childName: string;
  variant?: 'default' | 'featured';
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
  variant = 'default',
}: ParentVirtualAccountCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(accountNumber);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  if (variant === 'featured') {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2744] via-[#243352] to-[#1a2744] p-5 text-white shadow-xl sm:p-6">
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-[#c9a96e]/20 blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c9a96e]">
                <Building2 className="size-3.5" aria-hidden />
                Dedicated bank account
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                Transfer from any Nigerian bank for {childName}. We match and apply it automatically — no reference
                code needed.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">Account number (NUBAN)</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p
                className="font-mono tracking-[0.12em] text-white"
                style={{ fontSize: 'clamp(1.35rem, 4vw, 1.75rem)', fontWeight: 800 }}
              >
                {accountNumber}
              </p>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#c9a96e] px-4 text-[13px] font-bold text-[#0f1729] transition hover:bg-[#d4b87e] active:scale-[0.98]"
                onClick={() => void handleCopy()}
              >
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied ? 'Copied' : 'Copy number'}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-white/5 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Bank</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white/90">{bankName}</p>
            </div>
            <div className="rounded-lg bg-white/5 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Account name</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white/90">{accountName}</p>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-white/55">
            Partial payments reduce the balance. Overpayment is saved as fee credit. Refresh after transferring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={ACADEMIC_UI.dataPanel}>
      <div className={`${ACADEMIC_UI.tableHeader} px-4 py-4 sm:px-5`}>
        <p className="flex items-center gap-2 text-[14px] font-bold text-neutral-900">
          <Building2 className="size-4 text-brand-600" aria-hidden />
          Pay by bank transfer
        </p>
        <p className="mt-1 text-[12px] text-neutral-600">
          Dedicated account for {childName}.
        </p>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-xl bg-brand-50/40 p-4 ring-1 ring-brand-100/40">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Account number</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="font-mono text-lg font-bold tracking-wide text-neutral-900">{accountNumber}</p>
            <button
              type="button"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-muted/60 text-neutral-700 hover:bg-muted"
              onClick={() => void handleCopy()}
              aria-label="Copy account number"
            >
              {copied ? <Check className="size-4 text-accent-green-700" /> : <Copy className="size-4" />}
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
      </div>
    </div>
  );
}
