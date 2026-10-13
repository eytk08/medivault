/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '.theme-dark'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#102435',
        mist: '#f4f7f8',
        teal: { 50: '#eefaf7', 100: '#d6f3eb', 500: '#20a88a', 600: '#13866e', 700: '#106c5a' },
        accent: '#e8f8f3'
      },
      boxShadow: { soft: '0 18px 50px rgba(15, 39, 53, 0.07)' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
};
