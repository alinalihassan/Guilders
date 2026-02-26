import { createOpenAPI } from "fumadocs-openapi/server";

function getApiBaseUrl(): string {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  return base.replace(/\/$/, "");
}

function getOpenApiDocumentUrl(): string {
  return process.env.OPENAPI_JSON_URL ?? `${getApiBaseUrl()}/openapi/json`;
}

export const openapi = createOpenAPI({
  input: [getOpenApiDocumentUrl()],
});
