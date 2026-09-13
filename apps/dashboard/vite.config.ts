import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3002,
  },
  preview: {
    port: 3002,
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
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
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
});
