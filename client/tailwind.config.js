/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '320px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          DEFAULT: '#16a34a',
          600: '#16a34a',
          dark: '#166534',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
          light: '#22c55e',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          DEFAULT: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        earth: {
          light: '#92400e',
          DEFAULT: '#78350f',
          dark: '#451a03',
        },
        surface: {
          light: '#ffffff',
          dark: '#0f172a',
          'dark-card': '#1e293b',
          'dark-muted': '#334155',
        }
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-soft': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
