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
        display: ["Archivo", "sans-serif"],
        mono: ["Azeret Mono", "monospace"],
      },
      fontSize: {
        massive: "clamp(3.5rem, 11vw, 9rem)",
        big: "clamp(2rem, 5vw, 3.5rem)",
        mid: "clamp(1.25rem, 2.5vw, 1.75rem)",
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
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        grain: "grain-drift 0.8s steps(6) infinite",
        marquee: "marquee 25s linear infinite",
      },
    },
  },
  plugins: [],
};
