import { SEMANTIC } from '@/lib/design/surfaces';

/** Matches staff/dashboard patterns — brand CTAs, neutral secondaries, no outline buttons. */
export const ACADEMIC_UI = {
  btnPrimary:
    `inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[14px] font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.98] ${SEMANTIC.cta.primary}`,
  btnPrimarySm:
    `inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.98] ${SEMANTIC.cta.primary}`,
  btnSecondary:
    'inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98]',
  btnSecondarySm:
    'inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-medium text-neutral-700 transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98]',
  chipActive:
    'rounded-xl bg-brand-500 px-3.5 py-2 text-[12px] font-semibold text-neutral-900 shadow-sm ring-1 ring-brand-400/30',
  chipInactive:
    'rounded-xl px-3.5 py-2 text-[12px] font-semibold text-neutral-500 transition-all duration-200 hover:bg-brand-50 hover:text-brand-700',
  sectionLabel: 'text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400',
  pageTitle: 'mt-1 text-neutral-900',
  pageDesc: 'mt-1.5 max-w-2xl text-[13px] leading-relaxed text-neutral-500',
  /** Interactive card surface — hover lift + shadow. */
  interactiveCard:
    'card rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
  /** Table/list container with soft border. */
  dataPanel: 'overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm',
  tableHeader: 'bg-gradient-to-r from-neutral-50 to-brand-50/30',
} as const;

export const ACADEMIC_PAGE_TITLE_STYLE = {
  fontSize: '1.875rem',
  fontWeight: 800,
  letterSpacing: '-0.025em',
  lineHeight: 1.2,
} as const;
