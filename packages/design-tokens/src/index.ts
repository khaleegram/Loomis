/**
 * Chancellor Navy (The Sovereign Trust)
 * Flat-Minimalist, High-Contrast design system.
 * Inspired by maritime academy uniforms, authority, and crisp modern administration.
 */
export const colors = {
  brand: {
    50: '#f0f4f8',
    100: '#d9e2ec',
    200: '#bcccdc',
    300: '#9fb3c8',
    400: '#829ab1',
    500: '#627d98',
    600: '#486581',
    700: '#334e68',
    800: '#243b53',
    900: '#0F1E36',
  },
  navy: {
    50: '#e8edf3',
    100: '#c2d0e0',
    200: '#9cb3cc',
    300: '#7596b9',
    400: '#4f79a5',
    500: '#3a5f88',
    600: '#2c4a6e',
    700: '#1f3652',
    800: '#132439',
    900: '#0A0F1D',
  },
  sand: {
    50: '#fcfbf8',
    100: '#f5f1e9',
    200: '#E6DFD3',
    300: '#d4cbbd',
    400: '#b8ae9e',
    500: '#9e9485',
    600: '#847b6e',
    700: '#6b6358',
    800: '#514b43',
    900: '#383430',
  },
  sky: {
    400: '#38BDF8',
    500: '#0ea5e9',
    600: '#0284c7',
  },
  success: '#15803d',
  warning: '#b45309',
  danger: '#b91c1c',
  neutral: {
    50: '#F4F7FA',
    100: '#e2e8f0',
    200: '#cbd5e1',
    300: '#94a3b8',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0F172A',
  },
  surface: {
    light: '#FFFFFF',
    dark: '#161F30',
    darker: '#111827',
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
    sans: '"SF Pro Display", "Roboto", system-ui, -apple-system, sans-serif',
    serif: '"New York", Georgia, "Times New Roman", serif',
    mono: '"SF Mono", ui-monospace, "Cascadia Code", monospace',
  },
  sizes: { xs: 12, sm: 14, base: 16, lg: 18, xl: 24, '2xl': 32 },
} as const;

export const radii = { sm: 0, md: 0, lg: 0, xl: 0, full: 0 } as const;

export const shadows = {
  xs: 'none',
  sm: 'none',
  md: 'none',
  card: 'none',
} as const;
