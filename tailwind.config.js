/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: '#E8F4FF',
          100: '#B5D8FF',
          200: '#82BCFF',
          300: '#4FA0FF',
          400: '#1C84FF',
          500: '#0A1628',
          600: '#081222',
          700: '#060D1B',
          800: '#040915',
          900: '#02040E',
        },
        accent: {
          DEFAULT: '#00F0FF',
          hover: '#33F3FF',
          dark: '#00B8C4',
        },
        warning: {
          DEFAULT: '#FF6B35',
          hover: '#FF8A5C',
          dark: '#CC562A',
        },
        success: {
          DEFAULT: '#00D26A',
          hover: '#33DB88',
          dark: '#00A854',
        },
        danger: {
          DEFAULT: '#FF3B30',
          hover: '#FF6259',
          dark: '#CC2F26',
        },
        industrial: {
          bg: '#0A1628',
          panel: '#1A2942',
          border: '#2A3F5F',
          grid: '#152238',
          text: '#E8F0F8',
          muted: '#8A9CB3',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 240, 255, 0.3)',
        'glow-warning': '0 0 20px rgba(255, 107, 53, 0.3)',
        'glow-success': '0 0 20px rgba(0, 210, 106, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(0, 240, 255, 0.1)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 30px rgba(0, 240, 255, 0.8)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(42, 63, 95, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(42, 63, 95, 0.3) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
