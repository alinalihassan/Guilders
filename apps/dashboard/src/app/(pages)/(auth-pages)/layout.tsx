import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clientEnv } from "@/lib/env";
import { getSession } from "@/lib/session.functions";

const OAUTH_PAGES = ["/oauth/sign-in", "/oauth/consent"];

export const Route = createFileRoute("/(pages)/(auth-pages)")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    const pathname = location.pathname;
    const isOAuthPage = OAUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (session && !isOAuthPage) {
      throw redirect({ to: "/" });
    }
  },
  component: AuthPagesLayout,
});

function AuthPagesLayout() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      <Button asChild variant="ghost" size="sm" className="absolute left-4 top-4">
        <a href={clientEnv.VITE_WEBSITE_URL}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </a>
      </Button>
      <Outlet />
    </div>
  );
}
