import { type InferPageType, loader, multiple, source as createSource } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { docs } from "fumadocs-mdx:collections/server";
import { openapiPlugin, openapiSource } from "fumadocs-openapi/server";

import { openapi } from "@/lib/openapi";

async function getOpenApiPages() {
  try {
    return await openapiSource(openapi, {
      baseDir: "api-reference",
      groupBy: "tag",
    });
  } catch {
    return createSource({
      pages: [],
      metas: [],
    });
  }
}

const openapiPages = await getOpenApiPages();

function hasGetSchema(data: unknown): data is { getSchema: () => { bundled: unknown } } {
  return (
    typeof data === "object" &&
    data !== null &&
    "getSchema" in data &&
    typeof (data as { getSchema?: unknown }).getSchema === "function"
  );
}

function hasGetText(
  data: unknown,
): data is { title?: string; getText: (mode: "processed") => Promise<string> } {
  return (
    typeof data === "object" &&
    data !== null &&
    "getText" in data &&
    typeof (data as { getText?: unknown }).getText === "function"
  );
}

export const source = loader(
  multiple({
    docs: docs.toFumadocsSource(),
    openapi: openapiPages,
  }),
  {
    baseUrl: "/",
    plugins: [lucideIconsPlugin(), openapiPlugin()],
  },
);

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "image.webp"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  if (hasGetSchema(page.data)) {
    return JSON.stringify(page.data.getSchema().bundled, null, 2);
  }

  if (!hasGetText(page.data)) return `# ${page.data.title}`;

  const processed = await page.data.getText("processed");

  return `# ${page.data.title}

${processed}`;
}
