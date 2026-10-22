/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#6366f1", dark: "#4f46e5", light: "#e0e7ff" },
        sidebar: "#0f172a",
      },
      keyframes: {
        bounceDot: {
          "0%,60%,100%": { transform: "translateY(0)" },
          "30%": { transform: "translateY(-6px)" },
        },
        fadeUp: {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        "bounce-dot": "bounceDot 1.2s infinite",
        "fade-up": "fadeUp 0.2s ease",
      },
    },
  },
  plugins: [],
};


