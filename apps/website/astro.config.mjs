import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://guilders.app",
  server: { port: 3001 },
  integrations: [tailwind()],
});
