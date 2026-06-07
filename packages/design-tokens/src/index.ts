/**
 * Platform-agnostic design tokens shared by web (Tailwind) and mobile (NativeWind).
 * Regent Emerald — Classic Prestige palette.
 */
export const colors = {
  brand: {
    50: '#ecfdf3',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#0a4226',
    700: '#083520',
    800: '#062a18',
    900: '#041a0f',
  },
  gold: {
    50: '#fdf8e8',
    100: '#f9edc4',
    200: '#f2da88',
    300: '#e8c547',
    400: '#d4af37',
    500: '#b8962e',
    600: '#92700c',
    700: '#6b5209',
    800: '#4a3806',
    900: '#2e2304',
  },
  mint: {
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
  },
  success: '#15803d',
  warning: '#b45309',
  danger: '#b91c1c',
  neutral: {
    50: '#fdfbf7',
    100: '#f5f2eb',
    200: '#e8e4dc',
    300: '#d6d0c4',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  forest: {
    950: '#0b1410',
    900: '#14201a',
    800: '#1a2b22',
    700: '#243b2f',
    600: '#2f4d3c',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, sans-serif',
    serif: 'Playfair Display, Georgia, serif',
    mono: 'ui-monospace, SF Mono, monospace',
  },
  sizes: { xs: 12, sm: 14, base: 16, lg: 18, xl: 24, '2xl': 32 },
} as const;

export const radii = { sm: 4, md: 6, lg: 8, xl: 12, full: 9999 } as const;

export const shadows = {
  xs: '0 1px 2px rgb(10 66 38 / 0.04)',
  sm: '0 1px 3px rgb(10 66 38 / 0.06), 0 1px 2px rgb(10 66 38 / 0.04)',
  md: '0 4px 12px rgb(30 41 59 / 0.06), 0 2px 4px rgb(10 66 38 / 0.04)',
  card: '0 2px 8px rgb(30 41 59 / 0.05), 0 1px 2px rgb(10 66 38 / 0.03)',
} as const;
