/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#174B35',
          dark: '#0f3324',
          light: '#236549',
          50: '#f0f7f3',
          100: '#dceee3',
          800: '#174B35',
          900: '#0f3324',
        },
        harvest: {
          DEFAULT: '#D7B66A',
          dark: '#b59346',
          light: '#e4c98a',
          50: '#fbf7ee',
          100: '#f6eed8',
        },
        ivory: {
          DEFAULT: '#F5F3EA',
          light: '#FAF9F4',
          dark: '#EBE7D8',
        },
        charcoal: {
          DEFAULT: '#25352C',
          light: '#374b40',
          dark: '#1a2620',
          muted: '#52665b',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans Devanagari"',
          '"Noto Sans Gurmukhi"',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        hindi: ['"Noto Sans Devanagari"', 'sans-serif'],
        punjabi: ['"Noto Sans Gurmukhi"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

