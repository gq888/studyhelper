/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        ink: {
          900: '#1f1d1c',
          800: '#3a3735',
          700: '#5e5853',
          600: '#7a736e',
          500: '#9c9590',
        },
        paper: '#fffdf8',
      },
      fontFamily: {
        round: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 6px 24px -8px rgba(251,124,45,0.18), 0 2px 8px -2px rgba(0,0,0,0.06)',
        ring: '0 0 0 4px rgba(251,124,45,0.18)',
      },
      animation: {
        'bounce-slow': 'bounce 2.4s infinite',
      },
    },
  },
  plugins: [],
}
