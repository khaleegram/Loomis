import { SEMANTIC } from '@/lib/design/surfaces';

export const PLATFORM_PAGE_CLASS = 'max-w-[1200px] px-4 py-5 sm:px-6 lg:px-7 lg:py-7';

export const PLATFORM_UI = {
  sectionLabel: 'text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400',
  pageTitle: 'text-neutral-900 text-2xl lg:text-[1.875rem]',
  pageTitleStyle: { fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2 } as const,
  pageDesc: 'mt-1.5 text-[13px] text-neutral-500',
  btnPrimary: `inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[14px] font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.98] ${SEMANTIC.cta.primary}`,
  btnSecondary:
    'inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98]',
  chipActive:
    'rounded-xl bg-brand-500 px-3.5 py-2 text-[12px] font-semibold text-neutral-900 shadow-sm ring-1 ring-brand-400/30',
  chipInactive:
    'rounded-xl px-3.5 py-2 text-[12px] font-semibold text-neutral-500 transition-all duration-200 hover:bg-brand-50 hover:text-brand-700',
  dataPanel: 'overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm',
  tableHeader: 'bg-gradient-to-r from-neutral-50 to-brand-50/30',
} as const;
