import { z } from "zod";

const clientEnvSchema = z.object({
  VITE_WEBSITE_URL: z.string().url().default("https://guilders.app"),
  VITE_DASHBOARD_URL: z.string().url().default("https://dashboard.guilders.app"),
  VITE_API_URL: z.string().url().default("https://api.guilders.app"),
  VITE_NGROK_URL: z.string().url().optional(),
});

// Validate client environment (missing vars fall back to production URLs)
export const clientEnv = clientEnvSchema.parse(import.meta.env);
