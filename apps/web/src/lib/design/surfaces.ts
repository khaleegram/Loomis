/**
 * Token-backed surfaces and semantic colour classes.
 * All values resolve through @loomis/design-tokens CSS variables.
 */
export const SURFACES = {
  hero: 'var(--gradient-hero-surface)',
  profileHeader: 'var(--gradient-profile-surface)',
  profileFooter: 'var(--gradient-profile-footer)',
  tableHeader: 'var(--gradient-table-header)',
  kpi: {
    g1: 'var(--gradient-kpi-1)',
    g2: 'var(--gradient-kpi-2)',
    g3: 'var(--gradient-kpi-3)',
    g4: 'var(--gradient-kpi-4)',
    card: 'var(--gradient-kpi-card)',
  },
} as const;

/** Inline style colour values for dynamic props (e.g. subColor). */
export const STATUS_TEXT = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  muted: 'var(--color-neutral-400)',
} as const;

/** Reusable Tailwind class groups for semantic states. */
export const SEMANTIC = {
  warning: {
    surface: 'border-gold-200 bg-gold-50',
    surfaceSubtle: 'border-gold-100 bg-gold-50/30',
    text: 'text-gold-700',
    textStrong: 'text-gold-800',
    title: 'text-gold-900',
    icon: 'bg-gold-100 text-gold-700',
    accent: 'border-l-gold-500',
    button: 'bg-gold-600 text-white hover:bg-gold-700',
    pill: 'bg-gold-50 text-gold-700',
    pillMuted: 'bg-gold-50 text-gold-600',
  },
  danger: {
    text: 'text-danger',
    textStrong: 'text-danger',
    surface: 'border-danger/20 bg-danger/5',
    surfaceSubtle: 'border-danger/20 bg-danger/10',
    icon: 'bg-danger/10 text-danger',
    iconBg: 'bg-danger/10',
    iconColor: 'text-danger',
    accent: 'border-l-danger',
    button: 'text-danger hover:bg-danger/10 hover:text-danger',
    error: 'text-danger',
  },
  success: {
    icon: 'bg-accent-green-50 text-accent-green-600',
    iconBg: 'bg-accent-green-50',
    iconColor: 'text-accent-green-600',
    badge: 'border-accent-green-100 bg-accent-green-50 text-accent-green-700',
  },
  cta: {
    primary:
      'bg-brand-500 text-neutral-900 hover:bg-brand-600 dark:bg-primary dark:text-primary-foreground dark:hover:opacity-90',
    iconCircle: 'bg-brand-50 text-brand-700 dark:bg-accent dark:text-accent-foreground',
  },
} as const;
