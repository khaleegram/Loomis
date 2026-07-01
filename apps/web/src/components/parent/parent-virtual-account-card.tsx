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
      className="font-mono font-black tracking-[0.08em] text-white transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        fontSize: 'clamp(1.4rem, 3.5vw, 1.9rem)',
        letterSpacing: '0.1em',
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
      <div
        className="group relative overflow-hidden rounded-3xl text-white shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #0d1b35 0%, #1a2c52 35%, #0f2241 70%, #1a1a2e 100%)',
        }}
      >
        {/* Animated shimmer layer that fires on copy */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{ opacity: shimmer ? 1 : 0 }}
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(105deg, transparent 40%, rgba(201,169,110,0.18) 50%, transparent 60%)',
              animation: shimmer ? 'shimmer-sweep 0.7s ease-in-out' : 'none',
            }}
          />
        </div>

        {/* Floating orb – top right */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, #c9a96e 0%, transparent 70%)',
            animation: 'orb-float 6s ease-in-out infinite',
          }}
          aria-hidden
        />
        {/* Floating orb – bottom left */}
        <div
          className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #4f80e1 0%, transparent 70%)',
            animation: 'orb-float 8s ease-in-out infinite reverse',
          }}
          aria-hidden
        />

        {/* Noise texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
          aria-hidden
        />

        <div className="relative p-5 sm:p-7">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'rgba(201,169,110,0.18)', border: '1px solid rgba(201,169,110,0.3)' }}
              >
                <Building2 className="size-4 text-[#c9a96e]" aria-hidden />
              </span>
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.2em]"
                  style={{ color: '#c9a96e' }}
                >
                  Loomis × Nomba
                </p>
                <p className="text-[12px] font-semibold text-white/70">Dedicated fee account</p>
              </div>
            </div>
            {/* Live pulse indicator */}
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/60">
              <span
                className="block size-1.5 rounded-full bg-emerald-400"
                style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}
              />
              Live
            </span>
          </div>

          {/* Child name */}
          <p className="mt-4 text-[12px] leading-relaxed text-white/55">
            Payments to this account are auto-matched to{' '}
            <strong className="font-semibold text-white/85">{childName}</strong> — no reference code needed.
          </p>

          {/* Account number display */}
          <div
            className="relative mt-5 overflow-hidden rounded-2xl p-5"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <p
              className="mb-3 text-[10px] font-black uppercase tracking-[0.22em]"
              style={{ color: 'rgba(201,169,110,0.8)' }}
            >
              Account number (NUBAN)
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {groups.map((chunk, i) => (
                <AnimatedDigitGroup key={i} value={chunk} delay={i * 120} />
              ))}
            </div>
            {/* Subtle inner glow on the number box */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.5), transparent)' }}
              aria-hidden
            />
          </div>

          {/* Copy button */}
          <button
            type="button"
            className="group/btn relative mt-4 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl py-3.5 text-[14px] font-black tracking-wide transition-all duration-200 active:scale-[0.97]"
            style={{
              background: copied
                ? 'linear-gradient(135deg, #2d6a4f, #40916c)'
                : 'linear-gradient(135deg, #c9a96e, #b8943e)',
              color: copied ? '#fff' : '#0d1b35',
              boxShadow: copied ? '0 4px 20px rgba(64,145,108,0.4)' : '0 4px 20px rgba(201,169,110,0.35)',
            }}
            onClick={() => void handleCopy()}
          >
            <span
              className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              aria-hidden
            />
            {copied ? (
              <>
                <Check className="size-4.5 shrink-0" aria-hidden />
                Copied to clipboard
              </>
            ) : (
              <>
                <Copy className="size-4.5 shrink-0" aria-hidden />
                Copy account number
              </>
            )}
          </button>

          {/* Bank + Account name row */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Bank', value: bankName },
              { label: 'Account name', value: accountName },
            ].map((field) => (
              <div
                key={field.label}
                className="rounded-xl px-3.5 py-3"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{field.label}</p>
                <p className="mt-0.5 text-[12px] font-semibold leading-tight text-white/85">{field.value}</p>
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="mt-4 flex items-start gap-2">
            <Zap className="mt-0.5 size-3 shrink-0 text-[#c9a96e]/70" aria-hidden />
            <p className="text-[11px] leading-relaxed text-white/45">
              Partial payments reduce your balance. Extra credit carries to future invoices. Refresh after transferring.
            </p>
          </div>
        </div>

        {/* Keyframe styles */}
        <style>{`
          @keyframes orb-float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(10px, -12px) scale(1.05); }
            66% { transform: translate(-6px, 8px) scale(0.97); }
          }
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
