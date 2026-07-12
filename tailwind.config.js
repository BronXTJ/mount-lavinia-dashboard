/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Teal — primary accent (spec: #00b4d8)
        primary: {
          300: "#7de0f2",
          400: "#33c3e0",
          500: "#00b4d8",
          600: "#0090ad",
          700: "#00748a",
          800: "#075985",
          900: "#0c1f33",
        },
        // Orange — secondary accent (spec: #f77f00)
        accent: {
          300: "#ffc180",
          400: "#ff9a33",
          500: "#f77f00",
          600: "#cc6900",
          700: "#a35400",
        },
        // Dark UI scale — page bg #0f1923, card #1a2535, border #2a3a4a, text #e0e0e0
        surface: {
          50: "#e0e0e0",
          100: "#c7cfd6",
          200: "#9fadb9",
          300: "#76889a",
          400: "#5b6f82",
          700: "#2a3a4a",
          800: "#1a2535",
          850: "#141d2b",
          900: "#0f1923",
          950: "#0a121a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0, 0, 0, 0.24), 0 1px 3px 1px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
}
