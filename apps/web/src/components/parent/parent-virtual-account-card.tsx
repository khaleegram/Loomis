'use client';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { Building2, Check, Copy, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

/* Splits "0123456789" → ["012", "345", "678", "9"] for visual grouping */
function groupDigits(num: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < num.length; i += 3) {
    chunks.push(num.slice(i, i + 3));
  }
  return chunks;
}

function AnimatedDigitGroup({ value, delay }: { value: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);

  return (
    <span
      className="font-mono font-black tracking-[0.08em] text-neutral-900 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
        letterSpacing: '0.05em',
      }}
    >
      {value}
    </span>
  );
}

export function ParentVirtualAccountCard({
  accountNumber,
  bankName,
  accountName,
  childName,
  variant = 'default',
}: ParentVirtualAccountCardProps) {
  const [copied, setCopied] = useState(false);
  const [shimmer, setShimmer] = useState(false);
  const shimmerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleCopy() {
    const ok = await copyText(accountNumber);
    if (ok) {
      setCopied(true);
      setShimmer(true);
      shimmerRef.current = setTimeout(() => {
        setCopied(false);
        setShimmer(false);
      }, 2200);
    }
  }

  useEffect(() => {
    return () => {
      if (shimmerRef.current) clearTimeout(shimmerRef.current);
    };
  }, []);

  const groups = groupDigits(accountNumber);

  if (variant === 'featured') {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg">
        {/* Animated gradient border wrapper */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute -inset-[100%] animate-[spin_4s_linear_infinite]"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0 340deg, #c9a96e 360deg)',
            }}
          />
        </div>

        {/* Inner card content (covers the spinning gradient except for a 1px border) */}
        <div className="absolute inset-[1px] z-10 rounded-[15px] bg-white" />

        {/* Shimmer overlay on copy */}
        <div
          className="pointer-events-none absolute inset-[1px] z-20 overflow-hidden rounded-[15px] transition-opacity duration-500"
          style={{ opacity: shimmer ? 1 : 0 }}
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(201,169,110,0.15) 50%, transparent 60%)',
              animation: shimmer ? 'shimmer-sweep 0.7s ease-in-out' : 'none',
            }}
          />
        </div>

        <div className="relative z-30 p-4 sm:p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Building2 className="size-3.5" aria-hidden />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-700">
                  Loomis × Nomba
                </p>
                <p className="text-[12px] font-semibold text-neutral-600">Dedicated fee account</p>
              </div>
            </div>
            {/* Live pulse indicator */}
            <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-brand-700">
              <span
                className="block size-1.5 rounded-full bg-accent-green-500"
                style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}
              />
              Live
            </span>
          </div>

          {/* Child name */}
          <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">
            Payments to this account are auto-matched to{' '}
            <strong className="font-semibold text-neutral-800">{childName}</strong>.
          </p>

          {/* Account number display */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100/50 bg-brand-50/30 p-3 sm:p-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-brand-600/80">
                Account number (NUBAN)
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2">
                {groups.map((chunk, i) => (
                  <AnimatedDigitGroup key={i} value={chunk} delay={i * 120} />
                ))}
              </div>
            </div>

            {/* Copy button (Ghost style) */}
            <button
              type="button"
              className="group/btn relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-lg px-3 text-[12px] font-bold transition-all duration-200 active:scale-[0.97]"
              style={{
                background: copied ? '#ecfdf5' : '#fdfaf4',
                color: copied ? '#047857' : '#9a7b4f',
                border: copied ? '1px solid #a7f3d0' : '1px solid #f3e8d6',
              }}
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <>
                  <Check className="size-3.5 shrink-0" aria-hidden />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5 shrink-0" aria-hidden />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Bank + Account name row */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: 'Bank', value: bankName },
              { label: 'Account name', value: accountName },
            ].map((field) => (
              <div
                key={field.label}
                className="rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2"
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-400">{field.label}</p>
                <p className="mt-0.5 text-[12px] font-semibold leading-tight text-neutral-800">{field.value}</p>
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="mt-3 flex items-start gap-1.5">
            <Zap className="mt-0.5 size-3 shrink-0 text-brand-500" aria-hidden />
            <p className="text-[11px] leading-relaxed text-neutral-500">
              Partial payments reduce your balance. Extra credit carries to future invoices. Refresh after transferring.
            </p>
          </div>
        </div>

        {/* Keyframe styles */}
        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.75); }
          }
          @keyframes shimmer-sweep {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  /* Default (compact) variant */
  return (
    <div className={ACADEMIC_UI.dataPanel}>
      <div className={`${ACADEMIC_UI.tableHeader} px-4 py-4 sm:px-5`}>
        <p className="flex items-center gap-2 text-[14px] font-bold text-neutral-900">
          <Building2 className="size-4 text-brand-600" aria-hidden />
          Pay by bank transfer
        </p>
        <p className="mt-1 text-[12px] text-neutral-600">Dedicated account for {childName}.</p>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-xl bg-brand-50/40 p-4 ring-1 ring-brand-100/40">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Account number</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="font-mono text-lg font-bold tracking-widest text-neutral-900">{accountNumber}</p>
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
