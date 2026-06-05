/**
 * Platform-agnostic design tokens shared by web (Tailwind) and mobile (NativeWind),
 * so brand colors and spacing match across platforms (Frontend Architecture §8.7).
 */
export const colors = {
  brand: {
    50: '#eef5ff',
    100: '#d9e8ff',
    500: '#2563eb',
    600: '#1d4ed8',
    700: '#1e40af',
  },
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    500: '#64748b',
    900: '#0f172a',
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
  fontFamily: 'Inter, system-ui, sans-serif',
  sizes: { xs: 12, sm: 14, base: 16, lg: 18, xl: 24, '2xl': 32 },
} as const;

export const radii = { sm: 4, md: 8, lg: 12, full: 9999 } as const;
