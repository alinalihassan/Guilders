import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3002,
  },
  preview: {
    port: 3002,
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tsconfigPaths(),
    tanstackStart({
      srcDirectory: "src",
      router: {
        routesDirectory: "app",
        indexToken: /^page$/,
        routeToken: /^layout$/,
        routeFileIgnorePattern:
          "\\.(metadata|actions)\\.ts$|/route\\.ts$|-form\\.tsx$|-section\\.tsx$",
      },
    }),
    viteReact(),
  ],
});
