// Design System Tokens for FarmToHome (KisanSetu)

export const tokens = {
  colors: {
    primary: {
      light: '#22c55e',
      DEFAULT: '#16a34a',
      dark: '#166534',
      bgLight: '#f0fdf4',
      bgDark: '#052e16',
    },
    accent: {
      light: '#fde68a',
      DEFAULT: '#f59e0b',
      dark: '#b45309',
    },
    earth: {
      light: '#92400e',
      DEFAULT: '#78350f',
      dark: '#451a03',
    },
    semantic: {
      success: '#16a34a',
      warning: '#f59e0b',
      danger: '#dc2626',
      info: '#2563eb',
    }
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  breakpoints: {
    xs: 320,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  }
};

export default tokens;
