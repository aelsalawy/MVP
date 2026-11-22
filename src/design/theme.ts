/**
 * Design System Theme Tokens (T1.4 / spec Stitch 18343791301903817659)
 * Dark theme, sky-blue primary #38bdf8. RN numeric units throughout (no CSS px/strings).
 */
export const colors = {
  primary: {
    50: '#e0f2fe', 100: '#bae6fd', 200: '#7dd3fc', 300: '#38bdf8', 400: '#0ea5e9',
    500: '#0284c7', 600: '#0369a1', 700: '#075985', 800: '#0c4a6e', 900: '#082f49',
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b',
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
    500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
  },
  background: { base: '#0f172a', surface: '#1e293b', elevated: '#334155' },
  text: { primary: '#f8fafc', secondary: '#94a3b8', disabled: '#64748b' },
  border: { default: '#334155', focused: '#38bdf8', error: '#ef4444', warning: '#f59e0b' },
  success: { default: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },
  error: { default: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' },
  warning: { default: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' },
  info: { default: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)' },
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 } as const;
export const typography = {
  fontSize: { xs: 10, sm: 12, base: 14, lg: 16, xl: 18, xxl: 20, xxxl: 24, xxxxll: 30 } as const,
  fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' } as const,
  fontFamily: { base: 'Inter' as const },
};

export type ShadowElevation = 'sm' | 'md' | 'lg' | 'xl';
export type RNShadow = { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };

const hexToRgba = (hex: string, opacity: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
};

export const shadows: Record<ShadowElevation, RNShadow> = {
  sm: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 3 },
  lg: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 8 },
  xl: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.6, shadowRadius: 25, elevation: 12 },
};
