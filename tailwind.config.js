/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        inat: {
          green: '#74ac00',
          blue: '#1e88e5',
          orange: '#ff7f00',
          pink: '#ff4081',
          brown: '#795548',
          purple: '#9c27b0',
          gray: '#9e9e9e'
        }
      }
    },
  },
  plugins: [],
}

