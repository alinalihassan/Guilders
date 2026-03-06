/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--c-bg)",
        fg: "var(--c-fg)",
        gold: "var(--c-gold)",
        dim: "var(--c-dim)",
        line: "var(--c-line)",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        mono: ["Azeret Mono", "monospace"],
      },
      fontSize: {
        massive: "clamp(3rem, 12vw, 10rem)",
        big: "clamp(2rem, 5vw, 4rem)",
      },
      borderWidth: {
        3: "3px",
      },
      keyframes: {
        "grain-drift": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "10%": { transform: "translate(-2%, -3%)" },
          "30%": { transform: "translate(3%, 2%)" },
          "50%": { transform: "translate(-1%, 4%)" },
          "70%": { transform: "translate(2%, -2%)" },
          "90%": { transform: "translate(-3%, 1%)" },
        },
        "snap-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        grain: "grain-drift 0.8s steps(6) infinite",
        "snap-in": "snap-in 0.15s linear both",
      },
    },
  },
  plugins: [],
};
