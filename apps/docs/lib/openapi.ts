import { createOpenAPI } from "fumadocs-openapi/server";

function getOpenApiDocumentUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL_OPENAPI_JSON ??
    `${process.env.NEXT_PUBLIC_API_URL}/openapi/json`
  );
}

export const openapi = createOpenAPI({
  input: async () => {
    const url = getOpenApiDocumentUrl();
    const res = await fetch(url);
    const spec = await res.json();
    spec.servers = [{ url: process.env.NEXT_PUBLIC_API_URL }, { url: "http://localhost:3000" }];
    return { default: spec };
  },
});
