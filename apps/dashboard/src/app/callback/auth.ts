import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/callback/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const redirectTo = url.searchParams.get("redirect_to") ?? "/";
        const base = request.url.split("/callback")[0] ?? "";
        const fullUrl = redirectTo.startsWith("http") ? redirectTo : new URL(redirectTo, base).href;
        return Response.redirect(fullUrl);
      },
    },
  },
});
