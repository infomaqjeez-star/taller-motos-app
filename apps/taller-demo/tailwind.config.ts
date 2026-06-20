import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        maqjeez: {
          amber: "#FDB71A",
          "amber-deep": "#E09A00",
          navy: "#1E3A8A",
          orange: "#FF5722",
        },
        brand: {
          yellow: "#FFC107",
          yellowDark: "#E0A800",
          dark: "#09090B",
          panel: "#121214",
          card: "#18181B",
          border: "#27272A",
          input: "#202024",
          hover: "#3F3F46",
          text: "#E4E4E7",
          muted: "#A1A1AA",
        },
        accent: {
          green: "#22C55E",
          blue: "#0EA5E9",
          red: "#EF4444",
          orange: "#F97316",
        },
      },
      boxShadow: {
        "glow-green": "0 0 20px -5px rgba(34, 197, 94, 0.4)",
        "glow-yellow": "0 0 15px -3px rgba(255, 193, 7, 0.3)",
        "inner-dark": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.5)",
      },
      maxWidth: {
        content: "72rem",
      },
      spacing: {
        "nav-bottom": "4.25rem",
      },
    },
  },
  safelist: [
    "bottom-[88px]",
    "sm:bottom-6",
    "left-4",
    "sm:left-6",
    "right-4",
    "sm:right-6",
    "z-[55]",
    "h-14",
    "w-14",
    "sm:h-auto",
    "sm:w-auto",
    "sm:px-6",
  ],
  plugins: [typography],
};

export default config;
