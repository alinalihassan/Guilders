"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

function OAuthConsentForm() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authApiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const oauthQuery = useMemo(() => searchParams.toString(), [searchParams]);
  const clientId = searchParams.get("client_id") ?? "Unknown client";
  const scope = searchParams.get("scope") ?? "(none)";

  const submitConsent = async (accept: boolean) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`${authApiBase}/api/auth/oauth2/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accept,
          oauth_query: oauthQuery,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | { redirect_uri?: string; url?: string; error?: string; message?: string }
        | Record<string, unknown>;

      if (!response.ok) {
        toast.error("Consent failed", {
          description: (payload as { message?: string; error?: string }).message || (payload as { error?: string }).error || "Please try again.",
        });
        return;
      }

      const redirectUrl = (payload as { redirect_uri?: string; url?: string }).redirect_uri || (payload as { redirect_uri?: string; url?: string }).url;
      if (!redirectUrl) {
        toast.error("Consent failed", {
          description: "Missing redirect URL from authorization server.",
        });
        return;
      }

      window.location.href = redirectUrl;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-20 w-full max-w-xl rounded-md border bg-card p-6 shadow">
      <h1 className="text-2xl font-semibold">Authorize MCP Access</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Client <span className="font-medium text-foreground">{clientId}</span> is requesting access.
      </p>

      <div className="mt-4 rounded-md bg-muted p-3 text-sm">
        <div className="font-medium">Scopes</div>
        <div className="mt-1 break-words text-muted-foreground">{scope}</div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={() => submitConsent(true)} disabled={isSubmitting}>
          Allow
        </Button>
        <Button variant="outline" onClick={() => submitConsent(false)} disabled={isSubmitting}>
          Deny
        </Button>
      </div>
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-24 text-sm text-muted-foreground">Loading...</div>}>
      <OAuthConsentForm />
    </Suspense>
  );
}
