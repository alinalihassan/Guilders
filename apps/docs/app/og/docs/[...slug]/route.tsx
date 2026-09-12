import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";

import { getPageImage, source } from "@/lib/source";

export const revalidate = false;

function pageTitle(data: unknown): string {
  if (typeof data === "object" && data && "title" in data && typeof data.title === "string") {
    return data.title;
  }
  return "Guilders";
}

function pageDescription(data: unknown): string {
  if (
    typeof data === "object" &&
    data &&
    "description" in data &&
    typeof data.description === "string"
  ) {
    return data.description;
  }
  return "";
}

export async function GET(_req: Request, { params }: RouteContext<"/og/docs/[...slug]">) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  const title = pageTitle(page.data);
  const description = pageDescription(page.data);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "64px",
        backgroundColor: "#0a0a0a",
        color: "#fafafa",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 28, opacity: 0.7 }}>Guilders Docs</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
        {description ? <div style={{ fontSize: 28, opacity: 0.75 }}>{description}</div> : null}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
