import type { StudentStatus } from '@loomis/contracts';

import { studentStatusLabel } from '@/lib/student/student-labels';

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const variant =
    status === 'enrolled'
      ? 'brand'
      : status === 'admitted'
        ? 'gold'
        : status === 'graduated'
          ? 'secondary'
          : status === 'transferred_out'
            ? 'outline'
            : 'destructive';

  const colors: Record<string, string> = {
    brand: 'border-brand-200/80 bg-brand-50 text-brand-700',
    gold: 'border-gold-200/80 bg-gold-50 text-gold-700',
    secondary: 'border-neutral-200 bg-neutral-100 text-neutral-600',
    outline: 'border-neutral-200 bg-white text-neutral-500',
    destructive: 'border-danger/20 bg-danger/10 text-danger',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${colors[variant] ?? colors.outline}`}
    >
      {studentStatusLabel(status)}
    </span>
  );
}
