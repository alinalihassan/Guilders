"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DISPLAY_ONLY_QUERY_KEYS = new Set(["client_name", "client_uri"]);

const toOAuthQuery = (searchParams: ReturnType<typeof useSearchParams>) => {
  const params = new URLSearchParams(searchParams.toString());
  for (const key of DISPLAY_ONLY_QUERY_KEYS) {
    params.delete(key);
  }
  return params.toString();
};

function OAuthConsentForm() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authApiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const oauthQuery = useMemo(() => toOAuthQuery(searchParams), [searchParams]);
  const clientId = searchParams.get("client_id") ?? "Unknown client";
  const clientName = searchParams.get("client_name");
  const clientUri = searchParams.get("client_uri");
  const scope = searchParams.get("scope") ?? "(none)";
  const scopeList = useMemo(() => scope.split(/\s+/).filter(Boolean), [scope]);

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
    } catch {
      toast.error("Consent failed", {
        description: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <Card className="border bg-background shadow-md">
        <CardHeader className="space-y-3">
          <div className="flex flex-col items-center">
            <Image
              src="/assets/logo/logo_filled_rounded.svg"
              alt="logo"
              width={64}
              height={64}
              priority
            />
          </div>
          <div className="space-y-1 text-center">
            <CardTitle className="text-2xl">Authorize MCP Access</CardTitle>
            <CardDescription>
              Review permissions before allowing this app to continue.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Requesting application
            </div>
            <div className="break-all text-sm text-foreground">
              {clientName?.trim() || clientId}
            </div>
            {clientUri && (
              <div className="mt-1 break-all text-xs text-muted-foreground">{clientUri}</div>
            )}
          </div>

          <div className="rounded-md border bg-muted/40 p-3">
            <div className="mb-2 text-sm font-medium">Requested scopes</div>
            {scopeList.length > 0 ? (
              <ul className="grid gap-2 text-sm text-muted-foreground">
                {scopeList.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="break-all">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">(none)</div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            If you deny access, you will be redirected back to the app with an authorization error.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => submitConsent(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Deny
            </Button>
            <Button onClick={() => submitConsent(true)} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Processing..." : "Allow Access"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OAuthConsentSkeleton() {
  return (
    <div className="w-full max-w-xl">
      <Card className="animate-pulse border bg-background shadow-md">
        <CardHeader>
          <Image
            src="/assets/logo/logo_filled_rounded.svg"
            alt="logo"
            width={64}
            height={64}
            priority
            className="mx-auto opacity-30"
          />
          <div className="mx-auto h-6 w-64 rounded bg-muted" />
          <div className="mx-auto h-4 w-72 rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-16 rounded bg-muted" />
          <div className="h-24 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={<OAuthConsentSkeleton />}>
      <OAuthConsentForm />
    </Suspense>
  );
}
