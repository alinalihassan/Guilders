import { APIPage } from "@/components/api-page";
import { LLMCopyButton, ViewOptions } from "@/components/ai/page-actions";
import { gitConfig } from "@/lib/layout.shared";
import { getPageImage, source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ApiPageProps } from "fumadocs-openapi/ui";
import type { ComponentType } from "react";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

function hasOpenApiProps(
  data: unknown,
): data is { title?: string; getAPIPageProps: () => ApiPageProps } {
  return (
    typeof data === "object" &&
    data !== null &&
    "getAPIPageProps" in data &&
    typeof (data as { getAPIPageProps?: unknown }).getAPIPageProps === "function"
  );
}

export default async function Page(props: PageProps<'/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  if (hasOpenApiProps(page.data)) {
    return (
      <DocsPage full>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsBody>
          <APIPage {...page.data.getAPIPageProps()} />
        </DocsBody>
      </DocsPage>
    );
  }

  if (!("body" in page.data)) notFound();
  const docData = page.data;
  const MDX = docData.body as ComponentType<{ components?: Record<string, unknown> }>;

  return (
    <DocsPage toc={"toc" in docData ? docData.toc : undefined} full={"full" in docData ? docData.full : undefined}>
      <DocsTitle>{docData.title}</DocsTitle>
      <DocsDescription className="mb-0">{docData.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <LLMCopyButton markdownUrl={`https://raw.githubusercontent.com/${gitConfig.user}/${gitConfig.repo}/${gitConfig.branch}/apps/docs/content/docs/${page.path}`} />
        <ViewOptions
          markdownUrl={`https://raw.githubusercontent.com/${gitConfig.user}/${gitConfig.repo}/${gitConfig.branch}/apps/docs/content/docs/${page.path}`}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/apps/docs/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}
