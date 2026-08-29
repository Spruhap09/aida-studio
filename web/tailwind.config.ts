import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4eadc",
        ink: "#2a2118",
        clay: "#c4785b",
        moss: "#3f5c4b",
        thread: "#8b3a4a",
        gold: "#c4a35a",
        mist: "#efe4d4",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Outfit", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 40px rgba(42, 33, 24, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
