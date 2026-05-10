import type { Config } from "tailwindcss";

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
      },
      maxWidth: {
        content: "72rem",
      },
      spacing: {
        "nav-bottom": "4.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
