/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './modules/**/*.{js,ts,jsx,tsx,mdx}',
    './services/**/*.{js,ts,jsx,tsx,mdx}',
    './store/**/*.{js,ts,jsx,tsx,mdx}',
    './types/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#F4F8FB',
          secondary: '#FFFFFF',
          card: '#FFFFFF',
          hover: '#EEF4F8',
        },
        accent: {
          cyan: '#0A78A7',
          blue: '#4764B7',
          green: '#2DD4A7',
          yellow: '#F3B23C',
          red: '#FF5277',
          purple: '#7B55AD',
          magenta: '#AA337B',
        },
        text: {
          primary: '#111827',
          secondary: '#344054',
          muted: '#667085',
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300E5FF' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'adani-spectrum': 'linear-gradient(90deg, #0A78A7 0%, #4764B7 38%, #7B55AD 64%, #AA337B 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 4s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #0A78A7, 0 0 10px #4764B7' },
          '100%': { boxShadow: '0 0 20px #0A78A7, 0 0 40px #4764B7, 0 0 80px #AA337B' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        }
      },
      boxShadow: {
        'cyan-glow': '0 0 20px rgba(10, 120, 167, 0.3)',
        'green-glow': '0 0 20px rgba(45, 212, 167, 0.3)',
        'blue-glow': '0 0 20px rgba(71, 100, 183, 0.3)',
        'adani-glow': '0 0 38px rgba(71, 100, 183, 0.28), 0 0 52px rgba(170, 51, 123, 0.22)',
        'card': '0 16px 36px rgba(16, 24, 40, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
      }
    },
  },
  plugins: [],
}
