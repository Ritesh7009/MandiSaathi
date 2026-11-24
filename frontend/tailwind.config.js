/** @type {import('tailwindcss').Config} */
const indicStack = [
  '"Noto Sans Devanagari"',
  '"Noto Sans Gurmukhi"',
  '"Noto Sans Gujarati"',
  '"Noto Sans Bengali"',
  '"Noto Sans Telugu"',
  '"Noto Sans Tamil"',
  '"Noto Sans Kannada"',
  '"Noto Sans Malayalam"',
  '-apple-system',
  'BlinkMacSystemFont',
  'sans-serif',
];

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--ms-canvas-rgb) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--ms-surface-rgb) / <alpha-value>)',
          subtle: 'rgb(var(--ms-surface-subtle-rgb) / <alpha-value>)',
          elevated: 'rgb(var(--ms-surface-elevated-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ms-text-rgb) / <alpha-value>)',
          muted: 'rgb(var(--ms-text-muted-rgb) / <alpha-value>)',
          subtle: 'rgb(var(--ms-text-subtle-rgb) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'var(--ms-border)',
          strong: 'var(--ms-border-strong)',
        },
        canopy: {
          DEFAULT: 'rgb(var(--ms-emerald-rgb) / <alpha-value>)',
          bright: 'rgb(var(--ms-emerald-bright-rgb) / <alpha-value>)',
          soft: 'rgb(var(--ms-emerald-soft-rgb) / <alpha-value>)',
          deep: '#073B29',
        },
        saffron: {
          DEFAULT: 'rgb(var(--ms-saffron-rgb) / <alpha-value>)',
          soft: 'rgb(var(--ms-saffron-soft-rgb) / <alpha-value>)',
          ink: 'rgb(var(--ms-saffron-ink-rgb) / <alpha-value>)',
          text: 'rgb(var(--ms-saffron-text-rgb) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--ms-danger-rgb) / <alpha-value>)',
          soft: 'rgb(var(--ms-danger-soft-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['Outfit', ...indicStack],
        sans: ['"Plus Jakarta Sans"', ...indicStack],
        mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(11, 79, 55, 0.05)',
        card: '0 8px 28px -8px rgba(11, 79, 55, 0.08), 0 1px 3px 0 rgba(11, 79, 55, 0.04)',
        dock: '0 16px 40px -12px rgba(7, 59, 41, 0.22), 0 0 0 1px rgba(11, 79, 55, 0.08)',
        emeraldGlow: '0 12px 32px -6px rgba(16, 185, 129, 0.32)',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
