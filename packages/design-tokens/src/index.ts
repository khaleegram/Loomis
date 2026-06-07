/**
 * Platform-agnostic design tokens shared by web (Tailwind) and mobile (NativeWind).
 * Warm brown primary — elegant, authoritative, modern.
 */
export const colors = {
  brand: {
    50: 'hsl(35 33% 97%)',
    100: 'hsl(35 33% 90%)',
    200: 'hsl(35 33% 80%)',
    300: 'hsl(35 33% 70%)',
    400: 'hsl(35 33% 60%)',
    500: 'hsl(35 33% 55%)',
    600: 'hsl(35 33% 45%)',
    700: 'hsl(35 33% 35%)',
    800: 'hsl(35 33% 25%)',
    900: 'hsl(35 33% 15%)',
  },
  gold: {
    50: 'hsl(35 33% 97%)',
    100: 'hsl(35 33% 90%)',
    200: 'hsl(35 33% 80%)',
    300: 'hsl(35 33% 70%)',
    400: 'hsl(35 33% 60%)',
    500: 'hsl(35 33% 55%)',
    600: 'hsl(35 33% 45%)',
    700: 'hsl(35 33% 35%)',
    800: 'hsl(35 33% 25%)',
    900: 'hsl(35 33% 15%)',
  },
  mint: {
    400: 'hsl(35 33% 55%)',
    500: 'hsl(35 33% 45%)',
    600: 'hsl(35 33% 35%)',
  },
  success: 'hsl(142 76% 36%)',
  warning: 'hsl(35 92% 40%)',
  danger: 'hsl(0 84.2% 60.2%)',
  neutral: {
    50: 'hsl(240 5.3% 94.9%)',
    100: 'hsl(210 40% 96.1%)',
    200: 'hsl(214.3 31.8% 91.4%)',
    300: 'hsl(212.7 26.8% 83.9%)',
    400: 'hsl(215.4 16.3% 46.9%)',
    500: 'hsl(217.2 32.6% 20%)',
    600: 'hsl(222.2 47.4% 15%)',
    700: 'hsl(222.2 47.4% 11.2%)',
    800: 'hsl(224 71.4% 4.1%)',
    900: 'hsl(224 71.4% 4.1%)',
  },
  forest: {
    950: 'hsl(222 39% 11%)',
    900: 'hsl(222 39% 13%)',
    800: 'hsl(240 3.7% 15.9%)',
    700: 'hsl(240 3.7% 15.9%)',
    600: 'hsl(215 27.9% 16.9%)',
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
  xs: '0 1px 2px rgb(0 0 0 / 0.04)',
  sm: '0 1px 3px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04)',
  md: '0 4px 12px rgb(0 0 0 / 0.06), 0 2px 4px rgb(0 0 0 / 0.04)',
  card: '0 2px 8px rgb(0 0 0 / 0.05), 0 1px 2px rgb(0 0 0 / 0.03)',
} as const;
