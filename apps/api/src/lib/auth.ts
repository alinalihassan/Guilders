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
  plugins: [bearer(), openAPI({ disableDefaultReference: true }), expo()],
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  // biome-ignore lint/suspicious/noDuplicateObjectKeys: <explanation>
  trustedOrigins: [
    "guilders-mobile://",
    ...(process.env.NODE_ENV === "development" ? [
      "exp://",
      "exp://**",
      "exp://192.168.*.*:*/**",
    ] : [])
  ],
});
