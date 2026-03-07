import { z } from "zod";

const clientEnvSchema = z.object({
  VITE_WEBSITE_URL: z.string().url(),
  VITE_DASHBOARD_URL: z.string().url(),
  VITE_API_URL: z.string().url(),
  VITE_NGROK_URL: z.string().url().optional(),
});

// Validate client environment
export const clientEnv = clientEnvSchema.parse(import.meta.env);
