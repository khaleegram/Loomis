/**
 * Platform-agnostic design tokens — Loomis V2 Electric Blue.
 */
export const colors = {
  brand: {
    50: 'hsl(214 100% 97%)',
    100: 'hsl(214 95% 93%)',
    200: 'hsl(213 97% 87%)',
    300: 'hsl(212 96% 78%)',
    400: 'hsl(213 94% 68%)',
    500: 'hsl(217 91% 60%)',
    600: 'hsl(221 83% 53%)',
    700: 'hsl(224 76% 48%)',
    800: 'hsl(226 71% 40%)',
    900: 'hsl(224 64% 33%)',
  },
  accent: {
    green: { 50: 'hsl(138 76% 97%)', 500: 'hsl(142 76% 36%)', 600: 'hsl(142 72% 29%)' },
    purple: { 50: 'hsl(270 100% 98%)', 500: 'hsl(271 81% 56%)', 600: 'hsl(271 70% 49%)' },
    teal: { 50: 'hsl(166 76% 97%)', 500: 'hsl(173 80% 40%)', 600: 'hsl(175 84% 32%)' },
    orange: { 50: 'hsl(33 100% 96%)', 500: 'hsl(25 95% 53%)', 600: 'hsl(21 90% 48%)' },
    pink: { 50: 'hsl(330 100% 98%)', 500: 'hsl(330 81% 60%)' },
  },
  gold: {
    50: 'hsl(33 100% 96%)',
    100: 'hsl(34 100% 92%)',
    200: 'hsl(32 98% 83%)',
    300: 'hsl(31 97% 72%)',
    400: 'hsl(27 96% 61%)',
    500: 'hsl(25 95% 53%)',
    600: 'hsl(21 90% 48%)',
    700: 'hsl(17 88% 40%)',
    800: 'hsl(15 79% 34%)',
    900: 'hsl(15 75% 28%)',
  },
  mint: {
    400: 'hsl(213 94% 68%)',
    500: 'hsl(217 91% 60%)',
    600: 'hsl(221 83% 53%)',
  },
  success: 'hsl(142 76% 36%)',
  warning: 'hsl(38 92% 50%)',
  danger: 'hsl(0 84% 60%)',
  neutral: {
    50: 'hsl(210 40% 98%)',
    100: 'hsl(210 40% 96%)',
    200: 'hsl(214 32% 91%)',
    300: 'hsl(213 27% 84%)',
    400: 'hsl(215 16% 47%)',
    500: 'hsl(215 19% 35%)',
    600: 'hsl(215 25% 27%)',
    700: 'hsl(217 33% 17%)',
    800: 'hsl(222 47% 11%)',
    900: 'hsl(224 71% 4%)',
  },
  forest: {
    950: 'hsl(222 39% 9%)',
    900: 'hsl(222 39% 11%)',
    800: 'hsl(217 33% 17%)',
    700: 'hsl(215 25% 27%)',
    600: 'hsl(215 19% 35%)',
  },
  canvas: 'hsl(220 20% 97%)',
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
    serif: 'Inter, system-ui, sans-serif',
    mono: 'ui-monospace, SF Mono, monospace',
  },
  sizes: { xs: 12, sm: 14, base: 16, lg: 18, xl: 24, '2xl': 32 },
} as const;

export const radii = { sm: 6, md: 8, lg: 12, xl: 16, '2xl': 20, full: 9999 } as const;

export const shadows = {
  xs: '0 1px 2px rgb(15 23 42 / 0.04)',
  sm: '0 1px 3px rgb(15 23 42 / 0.06), 0 1px 2px rgb(15 23 42 / 0.04)',
  md: '0 4px 12px rgb(15 23 42 / 0.06), 0 2px 4px rgb(15 23 42 / 0.04)',
  card: '0 1px 3px rgb(15 23 42 / 0.04), 0 6px 24px rgb(15 23 42 / 0.06)',
  cardHover: '0 8px 32px rgb(37 99 235 / 0.08)',
} as const;
