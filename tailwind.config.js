/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Plus Jakarta Sans"', 'Inter', 'monospace'],
      },
      colors: {
        inat: {
          green: '#74ac00',
          greenHover: '#87c400',
          greenDark: '#659600',
          blue: '#1e88e5',
          orange: '#ff7f00',
          pink: '#ff4081',
          brown: '#795548',
          purple: '#9c27b0',
          gray: '#9e9e9e'
        },
        // Oficiální iNaturalist zelená (#74ac00) namapovaná do primární palety
        emerald: {
          50: '#f7fbe9',
          100: '#edf7ce',
          200: '#dcf0a1',
          300: '#bfe261',
          400: '#87c400',
          500: '#74ac00',
          600: '#659600',
          700: '#527a00',
          800: '#3f5e04',
          900: '#334c07',
          950: '#192702',
        }
      }
    },
  },
  plugins: [],
}
