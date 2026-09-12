import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://guilders.app",
  server: { port: 3001 },
  vite: {
    plugins: [tailwindcss()],
  },
});
