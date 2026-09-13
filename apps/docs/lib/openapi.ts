import { createOpenAPI } from "fumadocs-openapi/server";

function getOpenApiDocumentUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://guilders.app";
  return process.env.NEXT_PUBLIC_API_URL_OPENAPI_JSON ?? `${apiUrl}/openapi/json`;
}

export const openapi = createOpenAPI({
  input: {
    default: async () => {
      const url = getOpenApiDocumentUrl();
      const res = await fetch(url);
      const spec = await res.json();
      spec.servers = [
        { url: process.env.NEXT_PUBLIC_API_URL ?? "https://guilders.app" },
        { url: "http://localhost:3000" },
      ];
      return spec;
    },
  },
});
