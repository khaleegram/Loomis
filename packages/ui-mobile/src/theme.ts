/**
 * Loomis web-aligned surfaces for React Native (LinearGradient / StyleSheet).
 * Matches packages/design-tokens semantic.css + web SURFACES.
 */
export const LOOMIS = {
  bg: '#f8fafc',
  card: '#ffffff',
  brand: {
    50: '#fbf9f6',
    100: '#f5efe6',
    200: '#e8dfd0',
    500: '#b1996b',
    600: '#96774f',
    700: '#7d6342',
    800: '#6b5638',
  },
  neutral: {
    400: '#94a3b8',
    500: '#64748b',
    700: '#334155',
    900: '#0f172a',
  },
  success: '#16a34a',
  gold: '#d97706',
  gradients: {
    hero: ['#fbf9f6', '#f5efe6', '#ffffff'] as [string, string, string],
    heroEnd: ['#f5efe6', '#ffffff'] as [string, string],
    kpi: ['#c9a96e', '#8a7048'] as [string, string],
    kpi2: ['#96774f', '#6b5638'] as [string, string],
    avatar: ['#c9a96e', '#8a7048'] as [string, string],
  },
} as const;

/** Tailwind class groups — light theme only (matches web). No dark: variants. */
export const MOBILE_THEME = {
  screenRoot: 'flex-1 bg-neutral-50',
  ctaPrimary: 'bg-brand-500 text-neutral-900 active:bg-brand-600',
  ctaSecondary: 'bg-neutral-100 text-neutral-800 active:bg-neutral-200',
  dataPanel: 'rounded-2xl border border-brand-100/40 bg-white',
  sectionLabel: 'text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400',
  pageTitle: 'text-2xl font-extrabold tracking-tight text-neutral-900',
  heroGradient: 'bg-gradient-to-br from-brand-50 via-white to-brand-100/60',
  pillActive: 'bg-brand-500 shadow-sm shadow-brand-500/20',
  pillInactive: 'border border-brand-100/40 bg-white',
  toolbarSurface: 'border-b border-brand-100/30 bg-white',
  statusPresent: 'bg-accent-green-50 text-accent-green-600',
  statusAbsent: 'bg-red-50 text-red-600',
  statusLate: 'bg-gold-50 text-gold-600',
} as const;
