import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        maps: {
          brand: '#00a4c0',
          'brand-hover': '#0089a3',
          'brand-soft': 'rgba(0, 164, 192, 0.1)',
          dark: '#161121',
          heading: '#131117',
          body: '#374151',
          muted: '#6e6487',
          'muted-soft': '#9CA3AF',
          border: '#dedce5',
          surface: '#f8fafc',
          success: '#059669',
          warning: '#f59e0b',
          danger: '#e11d48',
          whatsapp: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 1px rgba(0, 0, 0, 0.05)',
        cta: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
        floating: '0 4px 12px rgba(15, 23, 42, 0.08)',
        profile: '0px 4px 20px -2px rgba(0, 0, 0, 0.05)',
      },
      zIndex: {
        'map-loading': '5',
        'map-controls': '10',
        'drawer-overlay': '50',
        'drawer-panel': '51',
        toast: '100',
        select: '120',
      },
      backgroundImage: {
        'hero-gradient':
          'linear-gradient(90deg, rgba(22,17,33,0.92) 0%, rgba(22,17,33,0.7) 50%, rgba(22,17,33,0.2) 100%)',
        'map-gradient': 'linear-gradient(135deg, #cfe5ec 0%, #b6d6e2 45%, #00a4c0 100%)',
        'library-gradient': 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #00a4c0 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
