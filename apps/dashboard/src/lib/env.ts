import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  shared: {
    NODE_ENV: z.enum(["development", "production"]),
    NEXT_PUBLIC_ALLOW_PREMIUM_FEATURES: z
      .string()
      .default("false")
      .refine((s) => s === "true" || s === "false")
      .transform((s) => s === "true"),
  },
  client: {
    // Umami (analytics)
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: z.string().min(1),
    // Other
    NEXT_PUBLIC_WEBSITE_URL: z.string().url(),
    NEXT_PUBLIC_DASHBOARD_URL: z.string().url(),
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_NGROK_URL: z.string().url(),
  },
  runtimeEnv: {
    // Shared
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_ALLOW_PREMIUM_FEATURES:
      process.env.NEXT_PUBLIC_ALLOW_PREMIUM_FEATURES,
    // Client
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
    NEXT_PUBLIC_WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL,
    NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_NGROK_URL: process.env.NEXT_PUBLIC_NGROK_URL,
  },
  emptyStringAsUndefined: true,
});
