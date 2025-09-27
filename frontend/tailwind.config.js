/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
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
          950: '#451a03',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-soft': 'bounceSoft 2s infinite',
        'fade-in-down': 'fadeInDown 0.5s ease-out',
        'slide-in-up': 'slideInUp 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'bounce-x': 'bounceX 1s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceX: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(10px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [function ({ addUtilities, addComponents }) {
    const newUtilities = {
      '.text-gradient': {
        background: 'linear-gradient(to right, var(--tw-gradient-stops))',
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent',
      },
    };
    addUtilities(newUtilities);

    const newComponents = {
      // Buttons
      '.btn': {
        '@apply inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg': {},
        '@apply transition-all duration-200 ease-in-out': {},
        '@apply focus:outline-none focus:ring-2 focus:ring-offset-2': {},
        '@apply disabled:opacity-50 disabled:cursor-not-allowed': {},
      },
      '.btn-primary': {
        '@apply bg-primary-600 hover:bg-primary-700 active:bg-primary-800': {},
        '@apply text-white': {},
        '@apply focus:ring-primary-500': {},
        '@apply shadow-sm hover:shadow-md': {},
      },
      '.btn-secondary': {
        '@apply bg-secondary-100 hover:bg-secondary-200 active:bg-secondary-300': {},
        '@apply dark:bg-secondary-800 dark:hover:bg-secondary-700 dark:active:bg-secondary-600': {},
        '@apply text-secondary-900 dark:text-secondary-100': {},
        '@apply focus:ring-secondary-500': {},
      },
      '.btn-success': {
        '@apply bg-success-600 hover:bg-success-700 active:bg-success-800': {},
        '@apply text-white': {},
        '@apply focus:ring-success-500': {},
      },
      '.btn-warning': {
        '@apply bg-warning-500 hover:bg-warning-600 active:bg-warning-700': {},
        '@apply text-white': {},
        '@apply focus:ring-warning-400': {},
      },
      '.btn-danger': {
        '@apply bg-danger-600 hover:bg-danger-700 active:bg-danger-800': {},
        '@apply text-white': {},
        '@apply focus:ring-danger-500': {},
      },
      '.btn-ghost': {
        '@apply bg-transparent hover:bg-secondary-100 active:bg-secondary-200': {},
        '@apply dark:hover:bg-secondary-800 dark:active:bg-secondary-700': {},
        '@apply text-secondary-700 dark:text-secondary-300': {},
        '@apply focus:ring-secondary-500': {},
      },
      '.btn-sm': {
        '@apply px-3 py-1.5 text-xs': {},
      },
      '.btn-lg': {
        '@apply px-6 py-3 text-base': {},
      },

      // Forms
      '.form-input': {
        '@apply w-full px-3 py-2 text-sm': {},
        '@apply bg-white dark:bg-secondary-800': {},
        '@apply border border-secondary-300 dark:border-secondary-600': {},
        '@apply rounded-lg shadow-inner-soft': {},
        '@apply text-secondary-900 dark:text-secondary-100': {},
        '@apply placeholder-secondary-400 dark:placeholder-secondary-500': {},
        '@apply transition-all duration-200': {},
        '@apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500': {},
      },
      '.form-label': {
        '@apply block text-sm font-medium': {},
        '@apply text-secondary-700 dark:text-secondary-300': {},
        '@apply mb-2': {},
      },
      '.form-select': {
        '@apply form-input': {},
        '@apply cursor-pointer': {},
      },
      '.form-textarea': {
        '@apply form-input': {},
        '@apply resize-vertical min-h-[80px]': {},
      },
      '.form-checkbox': {
        '@apply w-4 h-4 text-primary-600': {},
        '@apply bg-white dark:bg-secondary-800': {},
        '@apply border-secondary-300 dark:border-secondary-600': {},
        '@apply rounded focus:ring-primary-500': {},
        '@apply transition-all duration-200': {},
      },
      '.form-error': {
        '@apply mt-1 text-sm text-danger-600 dark:text-danger-400': {},
      },

      // Badges
      '.badge': {
        '@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium': {},
      },
      '.badge-primary': {
        '@apply bg-primary-100 text-primary-800': {},
        '@apply dark:bg-primary-900 dark:text-primary-200': {},
      },
      '.badge-success': {
        '@apply bg-success-100 text-success-800': {},
        '@apply dark:bg-success-900 dark:text-success-200': {},
      },
      '.badge-warning': {
        '@apply bg-warning-100 text-warning-800': {},
        '@apply dark:bg-warning-900 dark:text-warning-200': {},
      },
      '.badge-danger': {
        '@apply bg-danger-100 text-danger-800': {},
        '@apply dark:bg-danger-900 dark:text-danger-200': {},
      },
      '.badge-secondary': {
        '@apply bg-secondary-100 text-secondary-800': {},
        '@apply dark:bg-secondary-800 dark:text-secondary-200': {},
      },

      // Loading spinner
      '.spinner': {
        '@apply animate-spin rounded-full border-2 border-secondary-200': {},
        '@apply border-t-primary-600 dark:border-secondary-700 dark:border-t-primary-400': {},
      },

      // Tables
      '.table': {
        '@apply w-full divide-y divide-secondary-200 dark:divide-secondary-700': {},
      },
      '.table-header': {
        '@apply bg-secondary-50 dark:bg-secondary-800': {},
      },
      '.table-header-cell': {
        '@apply px-6 py-3 text-left text-xs font-medium': {},
        '@apply text-secondary-500 dark:text-secondary-400 uppercase tracking-wider': {},
      },
      '.table-body': {
        '@apply bg-white dark:bg-secondary-900 divide-y divide-secondary-200 dark:divide-secondary-700': {},
      },
      '.table-row': {
        '@apply hover:bg-secondary-50 dark:hover:bg-secondary-800': {},
        '@apply transition-colors duration-150': {},
      },
      '.table-cell': {
        '@apply px-6 py-4 whitespace-nowrap text-sm': {},
        '@apply text-secondary-900 dark:text-secondary-100': {},
      },
      '.card': {
        '@apply bg-white dark:bg-secondary-800': {},
        '@apply border border-secondary-200 dark:border-secondary-700': {},
        '@apply rounded-xl shadow-soft': {},
        '@apply transition-all duration-200': {},
      },
      '.card-hover': {
        '@apply hover:shadow-soft-lg hover:-translate-y-1': {},
      },
      '.card-header': {
        '@apply px-6 py-4 border-b border-secondary-200 dark:border-secondary-700': {},
      },
      '.card-body': {
        '@apply px-6 py-4': {},
      },
      '.card-footer': {
        '@apply px-6 py-4 border-t border-secondary-200 dark:border-secondary-700': {},
      },

      // Theme utility classes
      '.theme-text-primary': {
        '@apply text-secondary-900 dark:text-secondary-100': {},
      },
      '.theme-text-secondary': {
        '@apply text-secondary-600 dark:text-secondary-400': {},
      },
      '.theme-text-muted': {
        '@apply text-secondary-500 dark:text-secondary-500': {},
      },
      '.theme-bg-primary': {
        '@apply bg-white dark:bg-secondary-900': {},
      },
      '.theme-bg-secondary': {
        '@apply bg-secondary-50 dark:bg-secondary-800': {},
      },
      '.theme-border': {
        '@apply border-secondary-200 dark:border-secondary-700': {},
      },
      '.theme-border-light': {
        '@apply border-secondary-100 dark:border-secondary-800': {},
      },
      '.theme-btn-icon': {
        '@apply text-secondary-400 hover:text-secondary-600 dark:text-secondary-500 dark:hover:text-secondary-300': {},
        '@apply transition-colors duration-200': {},
      },

      // Alert styles
      '.theme-alert-info': {
        '@apply bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800': {},
        '@apply rounded-lg p-4': {},
      },
    };
    addComponents(newComponents);
  }],
}