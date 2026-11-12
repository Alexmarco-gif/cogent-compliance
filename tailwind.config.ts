import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Canvas & Surface
        canvas: "#F5F6FA",
        surface: "#FFFFFF",
        sidebar: "#0B0F1A",

        // Brand & Accents
        brand: {
          primary: "#2A4BFF",
          navy: "#0F172A",
          hover: "#1D3BD4",
        },

        // Three-Source Intelligence Badges
        badge: {
          statutory: {
            bg: "#EFF6FF",
            text: "#1D4ED8",
            border: "#BFDBFE",
          },
          playbook: {
            bg: "#F5F3FF",
            text: "#6D28D9",
            border: "#DDD6FE",
          },
          liveweb: {
            bg: "#ECFEFF",
            text: "#0E7490",
            border: "#A5F3FC",
          },
        },

        // Severity & Lock States
        status: {
          critical: {
            bg: "#FEF2F2",
            text: "#B91C1C",
            border: "#FECACA",
          },
          warning: {
            bg: "#FFFBEB",
            text: "#B45309",
            border: "#FDE68A",
          },
          success: {
            bg: "#F0FDF4",
            text: "#15803D",
            border: "#BBF7D0",
          },
          neutral: {
            bg: "#F8FAFC",
            text: "#475569",
            border: "#E2E8F0",
          },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "Fira Sans",
          "Droid Sans",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
