import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        maps: {
          brand: '#00a4c0',
          'brand-hover': '#0089a3',
          heading: '#111827',
          body: '#374151',
          muted: '#9CA3AF',
          border: '#E5E7EB',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
