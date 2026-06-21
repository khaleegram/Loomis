import { SEMANTIC } from '@/lib/design/surfaces';

/** Matches staff/dashboard patterns — theme-aware via semantic tokens. */
export const ACADEMIC_UI = {
  btnPrimary:
    `inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[14px] font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.98] ${SEMANTIC.cta.primary}`,
  btnPrimarySm:
    `inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.98] ${SEMANTIC.cta.primary}`,
  btnSecondary:
    'inline-flex h-9 items-center gap-2 rounded-lg bg-muted/60 px-4 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted active:scale-[0.98]',
  btnSecondarySm:
    'inline-flex h-8 items-center gap-1.5 rounded-lg bg-muted/60 px-3 text-[12px] font-medium text-foreground transition-all duration-200 hover:bg-muted active:scale-[0.98]',
  btnGhost:
    'inline-flex h-10 items-center gap-2 rounded-lg bg-muted/45 px-4 text-[14px] font-medium text-foreground transition-all duration-200 hover:bg-muted/80 active:scale-[0.98]',
  chipActive:
    'rounded-xl bg-brand-500 px-3.5 py-2 text-[12px] font-semibold text-neutral-900 shadow-sm ring-1 ring-brand-400/30 dark:text-neutral-950',
  chipInactive:
    'rounded-xl px-3.5 py-2 text-[12px] font-semibold text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground',
  /** Filter chip row — no outline box; soft inset surface */
  chipBar:
    'flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-muted/40 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  segmentedControl:
    'flex shrink-0 items-center rounded-2xl bg-muted/40 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]',
  subNavShell:
    'mb-6 flex w-full items-center gap-1.5 overflow-x-auto rounded-2xl bg-muted/35 p-1.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  searchField:
    'h-10 border-0 bg-muted/45 pl-10 pr-8 text-[13px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-transparent transition-all duration-200 placeholder:text-muted-foreground focus-visible:bg-card focus-visible:ring-brand-200/80',
  sectionLabel: 'text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground',
  pageTitle: 'mt-1 text-foreground',
  pageDesc: 'mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground',
  /** Hero / command deck shell — works in light and dark. */
  heroPanel:
    'relative overflow-hidden rounded-2xl bg-card text-card-foreground shadow-md',
  heroPill:
    'rounded-full bg-muted/55 px-3 py-1.5 text-[12px] font-semibold text-muted-foreground',
  heroPillBrand:
    'inline-flex items-center gap-1.5 rounded-full bg-brand-50/90 px-3 py-1 text-[11px] font-semibold text-brand-800 dark:bg-brand-900/25 dark:text-brand-200',
  /** Interactive card surface — hover lift + shadow. */
  interactiveCard:
    'card rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
  /** Table/list container — soft brand tint, no hard outline */
  dataPanel:
    'overflow-hidden rounded-2xl bg-card shadow-md ring-1 ring-brand-100/25 dark:ring-brand-900/20',
  tableHeader: 'bg-gradient-to-r from-muted/50 to-brand-50/30 dark:from-muted dark:to-brand-900/20',
} as const;

export const ACADEMIC_PAGE_TITLE_STYLE = {
  fontSize: '1.875rem',
  fontWeight: 800,
  letterSpacing: '-0.025em',
  lineHeight: 1.2,
} as const;
