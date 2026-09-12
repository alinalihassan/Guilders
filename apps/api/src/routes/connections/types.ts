import { z } from "zod";

export const connectionResultSchema = z.object({
  redirectURI: z.string(),
  type: z.enum(["redirect", "popup"]),
});

export const refreshResultSchema = z.object({
  success: z.boolean(),
  redirectURI: z.string().optional(),
  type: z.enum(["redirect", "popup"]).optional(),
});

export const providerOnlySchema = z.object({
  provider_id: z.string(),
});

export const createConnectionSchema = z.object({
  provider_id: z.string(),
  institution_id: z.string(),
});

export const reconnectSchema = z.object({
  provider_id: z.string(),
  institution_id: z.string(),
  account_id: z.string(),
});

export const refreshSchema = z.object({
  provider_id: z.string(),
  connection_id: z.string(),
});

export const syncSchema = z.object({
  account_id: z.string(),
});

export type ConnectionResponse = {
  redirectURI: string;
  type: "redirect" | "popup";
};
