import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { bearer, openAPI } from "better-auth/plugins";
import * as authSchema from "../db/schema/auth";
import { db } from "./db";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    bearer(),
    // Removed default reference since we integrate it in the main OpenAPI reference
    openAPI({ disableDefaultReference: true }),
    // TODO: Remove disableOriginOverride when Better Auth fixes the issue in v1.4.19
    expo({ disableOriginOverride: true }),
  ],
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  advanced: {
    disableOriginCheck: process.env.NODE_ENV === "development",
  },
  trustedOrigins: [
    "guilders-mobile://",
    ...(process.env.NODE_ENV === "development" ? [
      "http://localhost:3002",
      "http://localhost:3000",
      "exp://",
      "exp://**",
      "exp://192.168.*.*:*/**",
    ] : [])
  ],
});
