/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#070B14',
        panel: '#111A2F',
        line: '#24314F',
        primary: '#3B82F6',
        electric: '#22D3EE',
        vex: '#FF7A18',
        good: '#22C55E',
        bad: '#EF4444',
      },
      boxShadow: {
        glow: '0 18px 70px rgba(34, 211, 238, 0.12)',
      },
    },
  },
  plugins: [],
};
