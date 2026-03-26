import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#070710',
          925: '#0c0c18',
          900: '#10101e',
          800: '#1a1a2e',
          750: '#1e1e35',
          700: '#252540',
        },
        violet: {
          600: '#7c3aed',
          500: '#8b5cf6',
          400: '#a78bfa',
        },
        indigo: {
          600: '#4f46e5',
          500: '#6366f1',
          400: '#818cf8',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'accent-gradient': 'linear-gradient(135deg, #7c3aed, #4f46e5)',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(124, 58, 237, 0.25)',
        'glow': '0 0 24px rgba(124, 58, 237, 0.35)',
        'glow-lg': '0 0 40px rgba(124, 58, 237, 0.5)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'shimmer': 'shimmer 1.6s infinite linear',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
