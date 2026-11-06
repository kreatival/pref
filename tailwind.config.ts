import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f6f5f1",
        ink: { DEFAULT: "#1d232b", soft: "#4b5563", faint: "#8a919c" },
        brand: {
          50: "#eef2fa", 100: "#dde6f5", 200: "#bccdeb", 300: "#94afdd", 400: "#6b8fcf",
          500: "#4472c4", 600: "#385ea3", 700: "#2d4b84", 800: "#233a66", 900: "#182847",
        },
        line: "#d9d6cd",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
