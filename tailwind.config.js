/** @type {import('tailwindcss').Config} */
export default {
 content: [
  "./index.html",
  "./*.{js,ts,jsx,tsx}",
  "./components/**/*.{js,ts,jsx,tsx}",
  "./data/**/*.{js,ts,jsx,tsx}",
  "./store/**/*.{js,ts,jsx,tsx}",
  "./lib/**/*.{js,ts,jsx,tsx}",
],
  theme: {
    extend: {},
  },
  plugins: [],
}