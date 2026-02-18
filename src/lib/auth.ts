import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { bearer, openAPI } from "better-auth/plugins";
import * as authSchema from "../db/schema/auth";
import { db } from "./db";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [bearer(), openAPI({ disableDefaultReference: true })],
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
});
