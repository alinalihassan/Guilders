import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://guilders.app",
  server: { port: 3001 },
  integrations: [tailwind()],
});
