import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff9ff",
          100: "#dff1fe",
          200: "#b8e4fd",
          300: "#7ad0fb",
          400: "#34b8f7",
          500: "#0a9fe8",
          600: "#0080c6",
          700: "#0166a1",
          800: "#065585",
          900: "#0b476e",
          950: "#072d49",
        },
        teal: {
          500: "#14b8a6",
        },
        mint: "#34d399",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(31, 38, 135, 0.12)",
        "glass-lg": "0 16px 48px rgba(31, 38, 135, 0.18)",
        glow: "0 0 24px rgba(10, 159, 232, 0.35)",
        "glow-teal": "0 0 24px rgba(20, 184, 166, 0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #eff9ff 0%, #e0fbff 45%, #e6fcf0 100%)",
        "hero-gradient-dark":
          "linear-gradient(135deg, #072d49 0%, #0b3b54 45%, #0a3a33 100%)",
        "brand-gradient":
          "linear-gradient(135deg, #0a9fe8 0%, #14b8a6 50%, #34d399 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgba(10,159,232,.12) 0%, rgba(20,184,166,.12) 50%, rgba(52,211,153,.12) 100%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-22px) rotate(4deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        scan: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(320px)", opacity: "0" },
        },
        "ai-orbit": {
          "0%": { transform: "rotate(0deg) translateX(120px) rotate(0deg)" },
          "100%": {
            transform: "rotate(360deg) translateX(120px) rotate(-360deg)",
          },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 1.5s infinite",
        scan: "scan 2.2s ease-in-out infinite",
        "ai-orbit": "ai-orbit 14s linear infinite",
        "bounce-soft": "bounce-soft 2s ease-in-out infinite",
        "gradient-x": "gradient-x 6s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
