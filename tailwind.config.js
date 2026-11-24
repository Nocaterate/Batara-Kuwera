/** Tailwind is compiled at build time (it used to run from cdn.tailwindcss.com in the browser). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
};
