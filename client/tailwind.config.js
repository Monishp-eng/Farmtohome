/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#22c55e',
          DEFAULT: '#16a34a',
          dark: '#166534',
        },
        accent: {
          DEFAULT: '#f59e0b',
        },
        earth: {
          light: '#92400e',
          DEFAULT: '#78350f',
        }
      }
    },
  },
  plugins: [],
}
