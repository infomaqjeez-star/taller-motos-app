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
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74",
          400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c",
          800: "#9a3412", 900: "#7c2d12",
        },
        maqjeez: {
          yellow:      "#FDB71A",
          "yellow-dark": "#E09A00",
          blue:        "#1E3A8A",
          "blue-light": "#2563EB",
          "blue-pale": "#EFF6FF",
          orange:      "#FF5722",
          "orange-glow": "rgba(255,87,34,0.25)",
          neon:        "#39FF14",
          "neon-glow": "rgba(57,255,20,0.20)",
          cyan:        "#00E5FF",
          "cyan-glow": "rgba(0,229,255,0.20)",
          gold:        "#FFD700",
          "gold-glow": "rgba(255,215,0,0.20)",
          base:        "#050505",
          card:        "#121212",
        },
        jeez: {
          gold: '#dfb55a',
          dark: '#0a0a0a',
          panel: '#121212',
          danger: '#ef4444',
          success: '#22c55e'
        }
      },
      boxShadow: {
        "neon-orange": "0 0 16px 2px rgba(255,87,34,0.45)",
        "neon-green":  "0 0 16px 2px rgba(57,255,20,0.40)",
        "neon-cyan":   "0 0 16px 2px rgba(0,229,255,0.40)",
        "neon-gold":   "0 0 16px 2px rgba(255,215,0,0.40)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-sweep': 'glowSweep 3s ease-in-out infinite',
      },
      keyframes: {
        glowSweep: {
          '0%': { transform: 'translateX(-100%) skewX(15deg)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(200%) skewX(15deg)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
};

export default config;
