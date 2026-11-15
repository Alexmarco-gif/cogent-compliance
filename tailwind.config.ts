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
        // Document 12 Monochrome Design Tokens
        "surface-canvas": "#FFFFFF",
        "surface-subtle": "#FAFAFA",
        "surface-elevated": "#F4F4F5",
        "border-hairline": "#E4E4E7",
        "ink-primary": "#09090B",
        "ink-secondary": "#52525B",
        "ink-muted": "#A1A1AA",
        "action-primary": "#18181B",

        // Legacy compatibility aliases mapped to Document 12 monochrome system
        canvas: "#FAFAFA",
        surface: "#FFFFFF",
        sidebar: "#FAFAFA",

        brand: {
          primary: "#18181B",
          navy: "#09090B",
          hover: "#27272A",
          cobalt: "#2A4BFF",
        },

        // Three-Source Intelligence Subtle Tokens
        badge: {
          statutory: {
            bg: "#F4F4F5",
            text: "#18181B",
            border: "#E4E4E7",
          },
          playbook: {
            bg: "#F4F4F5",
            text: "#18181B",
            border: "#E4E4E7",
          },
          liveweb: {
            bg: "#F4F4F5",
            text: "#18181B",
            border: "#E4E4E7",
          },
        },

        // Semantic State Accents
        status: {
          critical: {
            bg: "#FFF1F2",
            text: "#BE123C",
            border: "#FECDD3",
          },
          warning: {
            bg: "#FFFBEB",
            text: "#B45309",
            border: "#FDE68A",
          },
          success: {
            bg: "#ECFDF5",
            text: "#047857",
            border: "#A7F3D0",
          },
          neutral: {
            bg: "#F4F4F5",
            text: "#52525B",
            border: "#E4E4E7",
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
          "Helvetica Neue",
          "sans-serif",
        ],
        serif: [
          "Instrument Serif",
          "Newsreader",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
