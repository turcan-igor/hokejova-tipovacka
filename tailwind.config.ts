import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ice: {
          50: "#f5fbff",
          100: "#e7f4fb",
          700: "#1d5d74",
          900: "#112d3a"
        },
        rink: {
          red: "#c21f32",
          blue: "#1769aa"
        }
      },
      boxShadow: {
        soft: "0 14px 40px rgba(17, 45, 58, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
