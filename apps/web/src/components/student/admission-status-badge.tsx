import type { AdmissionStatus } from '@loomis/contracts';

import { admissionStatusLabel } from '@/lib/student/student-labels';

export function AdmissionStatusBadge({ status }: { status: AdmissionStatus }) {
  const variant =
    status === 'approved'
      ? 'brand'
      : status === 'pending'
        ? 'gold'
        : status === 'declined'
          ? 'destructive'
          : 'outline';

  const colors: Record<string, string> = {
    brand: 'border-brand-200/80 bg-brand-50 text-brand-700',
    gold: 'border-gold-200/80 bg-gold-50 text-gold-700',
    destructive: 'border-danger/20 bg-danger/10 text-danger',
    outline: 'border-neutral-200 bg-white text-neutral-500',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${colors[variant] ?? colors.outline}`}
    >
      {admissionStatusLabel(status)}
    </span>
  );
}
