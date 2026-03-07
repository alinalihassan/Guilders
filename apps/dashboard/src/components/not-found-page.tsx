import { Link } from "@tanstack/react-router";
import { Home, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3">
          <span className="font-mono text-8xl font-semibold tabular-nums text-muted-foreground">
            404
          </span>
          <SearchX className="h-12 w-12 text-muted-foreground" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
          <p className="max-w-sm text-muted-foreground">
            This page doesn't exist or you don't have access to it. Head back to the dashboard to
            continue.
          </p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link to="/">
            <Home className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
