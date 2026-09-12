import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import { validateEnv } from "./env";
import { openApiDocumentation, scalarThemeCss } from "./lib/openapi";
import { api } from "./routes";
import { oauthPagesRoutes } from "./routes/oauth-pages";
import { oauthWellKnownRoutes } from "./routes/oauth-well-known";

validateEnv();

export const app = new Hono()
  .use(
    "*",
    cors({
      // Reflect request Origin so dashboard gets exact origin (required for cookies)
      // and API-key clients from any origin are not blocked
      origin: (origin) => origin,
      credentials: true,
    }),
  )
  .route("/", oauthPagesRoutes)
  .route("/", oauthWellKnownRoutes)
  .route("/api", api);

app.get(
  "/openapi/json",
  openAPIRouteHandler(app, {
    documentation: openApiDocumentation,
  }),
);

app.get(
  "/openapi",
  Scalar({
    url: "/openapi/json",
    hideClientButton: true,
    telemetry: false,
    hideDarkModeToggle: true,
    customCss: scalarThemeCss,
  }),
);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error("API Error:", err);
  return c.json(
    {
      error: err instanceof Error ? err.message : "Internal server error",
    },
    500,
  );
});

export type App = typeof app;
export default app;
