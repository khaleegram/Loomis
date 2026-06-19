import { SEMANTIC } from '@/lib/design/surfaces';

/** Matches staff/dashboard patterns — theme-aware via semantic tokens. */
export const ACADEMIC_UI = {
  btnPrimary:
    `inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[14px] font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.98] ${SEMANTIC.cta.primary}`,
  btnPrimarySm:
    `inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.98] ${SEMANTIC.cta.primary}`,
  btnSecondary:
    'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted/80 active:scale-[0.98]',
  btnSecondarySm:
    'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-foreground transition-all duration-200 hover:bg-muted/80 active:scale-[0.98]',
  chipActive:
    'rounded-xl bg-brand-500 px-3.5 py-2 text-[12px] font-semibold text-neutral-900 shadow-sm ring-1 ring-brand-400/30 dark:text-neutral-950',
  chipInactive:
    'rounded-xl px-3.5 py-2 text-[12px] font-semibold text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground',
  sectionLabel: 'text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground',
  pageTitle: 'mt-1 text-foreground',
  pageDesc: 'mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground',
  /** Hero / command deck shell — works in light and dark. */
  heroPanel:
    'relative overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm',
  heroPill:
    'rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[12px] font-semibold text-muted-foreground',
  heroPillBrand:
    'inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-brand-50/80 px-3 py-1 text-[11px] font-semibold text-brand-800 dark:border-brand-600/35 dark:bg-brand-900/25 dark:text-brand-200',
  /** Interactive card surface — hover lift + shadow. */
  interactiveCard:
    'card rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
  /** Table/list container with soft border. */
  dataPanel: 'overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
  tableHeader: 'bg-gradient-to-r from-muted/50 to-brand-50/30 dark:from-muted dark:to-brand-900/20',
} as const;

export const ACADEMIC_PAGE_TITLE_STYLE = {
  fontSize: '1.875rem',
  fontWeight: 800,
  letterSpacing: '-0.025em',
  lineHeight: 1.2,
} as const;
