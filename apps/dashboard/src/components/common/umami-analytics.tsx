import { env } from "@/lib/env";

export function UmamiAnalytics() {
  return (
    env.NODE_ENV === "production" && (
      <script
        defer
        src="https://cloud.umami.is/script.js"
        data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
      />
    )
  );
}
