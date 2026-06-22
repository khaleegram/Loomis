'use client';

import { AlertTriangle } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

const SOD_RULES = [
  { action: 'Verify payment', actor: 'Accountant', blocked: 'Cannot verify a payment you logged as Cashier' },
  { action: 'Log payment', actor: 'Cashier', blocked: 'Cannot verify your own logged payment' },
  { action: 'Approve refund (final)', actor: 'School Owner', blocked: 'Cannot approve if you were an earlier approver on the chain' },
  { action: 'Finalize staff role change', actor: 'School Owner', blocked: 'Cannot finalize a request you submitted as Principal' },
  { action: 'Initiate staff role change', actor: 'Principal', blocked: 'Cannot finalize the same request — Owner only' },
  { action: 'Regional KYC approve', actor: 'Regional Manager', blocked: 'Cannot approve your subordinate’s KYC' },
] as const;

interface SodNoticeProps {
  compact?: boolean;
  /** Highlight a specific rule by action label substring. */
  highlight?: string;
}

/** Master plan Appendix A — segregation of duties messaging. */
export function SodNotice({ compact = false, highlight }: SodNoticeProps) {
  const rules = highlight
    ? SOD_RULES.filter((r) => r.action.toLowerCase().includes(highlight.toLowerCase()))
    : SOD_RULES;

  if (compact && highlight && rules.length === 1) {
    const rule = rules[0]!;
    return (
      <p className="flex items-start gap-2 text-[12px] text-amber-900">
        <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>
          <strong>{rule.actor}:</strong> {rule.blocked}
        </span>
      </p>
    );
  }

  return (
    <section className={`${ACADEMIC_UI.dataPanel} space-y-3 p-4 sm:p-5`}>
      <div className="flex items-center gap-2">
        <AlertTriangle aria-hidden className="size-4 text-amber-700" />
        <h2 className="text-[14px] font-semibold text-neutral-900">Segregation of duties</h2>
      </div>
      <ul className="space-y-2 text-[12px] text-neutral-700">
        {rules.map((rule) => (
          <li key={rule.action} className="rounded-lg bg-amber-50/60 px-3 py-2">
            <span className="font-semibold text-neutral-900">{rule.action}</span>
            <span className="text-neutral-500"> · {rule.actor}</span>
            <p className="mt-0.5 text-neutral-600">{rule.blocked}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
