module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        waterblue: {
          light: '#e0f7fa',
          DEFAULT: '#4fc3f7',
          dark: '#0288d1',
        }
      }
    },
  },
  plugins: [],
}