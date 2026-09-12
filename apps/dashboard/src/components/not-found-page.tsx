import { Link } from "@tanstack/react-router";
import { Home, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground font-mono text-8xl font-semibold tabular-nums">
            404
          </span>
          <SearchX className="text-muted-foreground h-12 w-12" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-foreground text-2xl font-semibold">Page not found</h1>
          <p className="text-muted-foreground max-w-sm">
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
