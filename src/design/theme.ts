/**
 * Design System Theme Tokens
 *
 * Dark theme with sky-blue primary color (#38bdf8)
 * From Stitch project 18343791301903817659
 */

export const colors = {
  // Primary colors
  primary: {
    50: '#e0f2fe',
    100: '#bae6fd',
    200: '#7dd3fc',
    300: '#38bdf8',
    400: '#0ea5e9',
    500: '#0284c7',
    600: '#0369a1',
    700: '#075985',
    800: '#0c4a6e',
    900: '#082f49',
  },

  // Emerald accents
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // Amber accents
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Semantic colors
  background: {
    base: '#0f172a',      // Dark slate (main background)
    surface: '#1e293b',   // Lighter slate (cards, inputs)
    elevated: '#334155',  // Even lighter (modals, dropdowns)
  },

  text: {
    primary: '#f8fafc',   // White-ish
    secondary: '#94a3b8', // Slate gray
    disabled: '#64748b',  // Dim gray
  },

  border: {
    default: '#334155',
    focused: '#38bdf8',
    error: '#ef4444',
    warning: '#f59e0b',
  },

  // Status colors
  success: {
    default: '#10b981',
    background: 'rgba(16, 185, 129, 0.1)',
  },
  error: {
    default: '#ef4444',
    background: 'rgba(239, 68, 68, 0.1)',
  },
  warning: {
    default: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.1)',
  },
  info: {
    default: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.1)',
  },

  // Layout
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
  },
} as const;

export const typography = {
  fontFamily: {
    base: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  fontSize: {
    xs: '10px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '30px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Get color value by shade
 */
export const getColor = (color: keyof typeof colors, shade: number) => {
  return colors[color][shade as keyof typeof colors[color]] || colors[color][500];
};

/**
 * Get theme-specific shadow based on elevation
 */
export const getShadow = (elevation: keyof typeof shadows) => {
  return shadows[elevation];
};
