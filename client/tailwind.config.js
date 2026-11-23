import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [path.join(dir, 'index.html'), path.join(dir, 'src/**/*.{js,jsx}')],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#F6F7FB',
          100: '#EDEFF6',
          200: '#DDE1EC',
          300: '#C3C9DA',
          400: '#8F97B0',
          500: '#5F6885',
          600: '#414A66',
          700: '#2B3350',
          800: '#1A2138',
          900: '#101527',
          950: '#0A0E1A',
        },
        accent: {
          50: '#F2F0FF',
          100: '#E7E3FF',
          200: '#D1C9FF',
          300: '#B3A5FF',
          400: '#9179FF',
          500: '#6D5EF8',
          600: '#5A45E8',
          700: '#4A35C6',
          800: '#3E2DA1',
          900: '#352A80',
        },
        risk: {
          high: '#E0483D',
          mid: '#E5A117',
          low: '#2F9E64',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 21, 39, 0.04), 0 8px 24px -12px rgba(16, 21, 39, 0.12)',
        lift: '0 12px 32px -16px rgba(16, 21, 39, 0.28)',
        ring: '0 0 0 1px rgba(16, 21, 39, 0.06)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(109, 94, 248, 0.35)' },
          '70%': { boxShadow: '0 0 0 12px rgba(109, 94, 248, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(109, 94, 248, 0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
