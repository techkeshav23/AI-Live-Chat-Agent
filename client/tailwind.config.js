/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'spur-blue': '#2563eb',
        'spur-blue-dark': '#1e40af',
      },
    },
  },
  plugins: [],
}
