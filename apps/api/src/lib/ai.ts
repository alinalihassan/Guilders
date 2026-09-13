import { env } from "cloudflare:workers";
import { createWorkersAI } from "workers-ai-provider";
import { google } from "workers-ai-provider/google";
import { openai } from "workers-ai-provider/openai";

/** Latest GA Gemini Flash. Routed through AI Gateway (`guilders-ai-gateway`). */
export const GEMINI_FLASH_MODEL = "google-ai-studio/gemini-3.8-flash";

export const AI_GATEWAY_HEADERS = { "cf-aig-zdr": "true" } as const;

export function createGuildersAI() {
  return createWorkersAI({
    binding: env.AI,
    gateway: { id: "guilders-ai-gateway" },
    providers: [openai, google],
  });
}
