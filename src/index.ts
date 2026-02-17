import { fromTypes, openapi } from "@elysiajs/openapi";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { asset } from "./db/schema/assets";
import { OpenAPI } from "./lib/auth-openapi";
import { db } from "./lib/db";
import { authPlugin } from "./middleware/auth";

const app = new Elysia({ adapter: CloudflareAdapter })
  .use(
    openapi({
      references: fromTypes(),
      documentation: {
        components: await OpenAPI.components,
        paths: await OpenAPI.getPaths(),
      },
    }),
  )
  .get("/", () => "Hello World")
  .use(authPlugin)
  .get(
    "/assets",
    async ({ user }) => {
      return db.select().from(asset).where(eq(asset.user_id, user.id));
    },
    { auth: true },
  )
  .get(
    "/me",
    async ({ user }) => {
      return user;
    },
    { auth: true },
  )
  .compile();

export type App = typeof app;
export default app;
