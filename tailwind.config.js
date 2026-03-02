/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#13111C',
          surface: '#1E1B2E',
          card: '#252237',
          border: '#2E2A45',
          primary: '#E21B3C',
          accent: '#1368CE',
          yellow: '#D89E00',
          green: '#26890C',
          muted: '#7B7594',
          subtle: '#4A4564',
        },
      },
      fontFamily: {
        sans: ['Nunito_400Regular'],
        medium: ['Nunito_600SemiBold'],
        bold: ['Nunito_700Bold'],
        black: ['Nunito_900Black'],
      },
    },
  },
  plugins: [],
};
