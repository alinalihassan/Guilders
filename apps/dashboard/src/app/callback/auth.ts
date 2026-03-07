import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/callback/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const redirectTo = url.searchParams.get("redirect_to") ?? "/";
        const candidate = new URL(redirectTo, url.origin);
        const destination = candidate.origin === url.origin ? candidate : new URL("/", url.origin);
        return Response.redirect(destination.href);
      },
    },
  },
});
