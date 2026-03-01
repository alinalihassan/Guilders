import { t } from "elysia";

export const connectionResultSchema = t.Object({
  redirectURI: t.String(),
  type: t.Union([t.Literal("redirect"), t.Literal("popup")]),
});

export const refreshResultSchema = t.Object({
  success: t.Boolean(),
  redirectURI: t.Optional(t.String()),
  type: t.Optional(t.Union([t.Literal("redirect"), t.Literal("popup")])),
});

export const providerOnlySchema = t.Object({
  provider_id: t.String(),
});

export const createConnectionSchema = t.Object({
  provider_id: t.String(),
  institution_id: t.String(),
});

export const reconnectSchema = t.Object({
  provider_id: t.String(),
  institution_id: t.String(),
  account_id: t.String(),
});

export const refreshSchema = t.Object({
  provider_id: t.String(),
  connection_id: t.String(),
});

export const syncSchema = t.Object({
  account_id: t.String(),
});

export type ConnectionResponse = {
  redirectURI: string;
  type: "redirect" | "popup";
};
