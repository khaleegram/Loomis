import { SEMANTIC } from '@/lib/design/surfaces';

export const REGIONAL_PAGE_CLASS = 'max-w-[1200px] px-4 py-5 sm:px-6 lg:px-7 lg:py-7';

export const REGIONAL_UI = {
  sectionLabel: 'text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground',
  pageTitle: 'text-foreground text-2xl lg:text-[1.875rem]',
  pageTitleStyle: { fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2 } as const,
  pageDesc: 'mt-1.5 text-[13px] text-muted-foreground',
  btnPrimary: `inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[14px] font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.98] ${SEMANTIC.cta.primary}`,
  btnSecondary:
    'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted/80 active:scale-[0.98]',
  chipActive:
    'rounded-xl bg-brand-500 px-3.5 py-2 text-[12px] font-semibold text-neutral-900 shadow-sm ring-1 ring-brand-400/30 dark:text-neutral-950',
  chipInactive:
    'rounded-xl px-3.5 py-2 text-[12px] font-semibold text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground',
  dataPanel: 'overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
  heroPanel: 'hero-panel',
  tableHeader: 'bg-gradient-to-r from-muted/50 to-brand-50/30 dark:from-muted dark:to-brand-900/20',
} as const;
