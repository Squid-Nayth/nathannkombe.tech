/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./*.php",
    "./includes/**/*.php",
    "./src/**/*.{html,js,php}",
    "./public/**/*.{html,js}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
