/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          light: '#F5E0A3',
          DEFAULT: '#D4AF37', // Luxury Gold
          dark: '#B08E22',
          glow: 'rgba(212, 175, 55, 0.15)'
        },
        obsidian: {
          50: '#F5F5F7',
          100: '#E4E4E6',
          200: '#C7C7CC',
          700: '#3A3A3C',
          800: '#1C1C1E', // Elevated cards/surfaces
          900: '#121214', // Page Backgrounds
          950: '#0A0A0C'  // Sidebar / Header Backgrounds
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif']
      },
      boxShadow: {
        'gold-glow': '0 0 15px rgba(212, 175, 55, 0.2)',
        'premium': '0 8px 30px rgba(0, 0, 0, 0.5)'
      }
    },
  },
  plugins: [],
}
