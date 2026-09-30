/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        serif: ['Georgia', 'ui-serif', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        handwritten: ['"Segoe Print"', '"Bradley Hand"', '"Comic Sans MS"', 'cursive'],
      },
      colors: {
        ink: {
          50: '#f7f7f8',
          100: '#eef0f2',
          200: '#d8dce2',
          300: '#b6bcc7',
          400: '#8b93a3',
          500: '#6e7686',
          600: '#585e6c',
          700: '#494e59',
          800: '#3f434c',
          900: '#373a41',
          950: '#1c1d24',
        },
        accent: {
          50: '#eef4ff',
          100: '#e0ebff',
          200: '#c6daff',
          300: '#a2c1ff',
          400: '#7a9aff',
          500: '#5873f8',
          600: '#3d4ee8',
          700: '#303ccb',
          800: '#2c36a5',
          900: '#2b3383',
          950: '#1a1d4d',
        },
      },
      boxShadow: {
        soft: '0 2px 8px rgba(28,29,36,0.06), 0 12px 32px rgba(28,29,36,0.08)',
        lift: '0 4px 12px rgba(28,29,36,0.08), 0 20px 48px rgba(28,29,36,0.14)',
        glow: '0 0 0 1px rgba(88,115,248,0.2), 0 8px 32px rgba(88,115,248,0.25)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.25s cubic-bezier(0.21,1.02,0.73,1) forwards',
      },
    },
  },
  plugins: [],
};