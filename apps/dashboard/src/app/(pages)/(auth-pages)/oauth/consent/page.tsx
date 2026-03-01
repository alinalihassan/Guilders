"use client";

import { BookOpen, Eye, Info, Pencil, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const DISPLAY_ONLY_QUERY_KEYS = new Set(["client_name", "client_uri"]);

const toOAuthQuery = (searchParams: ReturnType<typeof useSearchParams>) => {
  const params = new URLSearchParams(searchParams.toString());
  for (const key of DISPLAY_ONLY_QUERY_KEYS) {
    params.delete(key);
  }
  return params.toString();
};

const SCOPE_GROUPS = {
  read: {
    label: "Read access",
    icon: Eye,
    capabilities: [
      "View your accounts, transactions, and categories",
      "View net worth and balance history",
      "View exchange rates and available institutions",
    ],
  },
  write: {
    label: "Write access",
    icon: Pencil,
    capabilities: [
      "Create, update, and delete accounts",
      "Create, update, and delete transactions",
      "Create transaction categories",
    ],
  },
} as const;

type ToggleableScope = keyof typeof SCOPE_GROUPS;

function OAuthConsentForm() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authApiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const oauthQuery = useMemo(() => toOAuthQuery(searchParams), [searchParams]);
  const clientId = searchParams.get("client_id") ?? "Unknown client";
  const clientName = searchParams.get("client_name");
  const clientUri = searchParams.get("client_uri");
  const scope = searchParams.get("scope") ?? "";
  const requestedScopes = useMemo(() => scope.split(/\s+/).filter(Boolean), [scope]);

  const hasExplicitScopes = requestedScopes.includes("read") || requestedScopes.includes("write");

  const [writeEnabled, setWriteEnabled] = useState(
    hasExplicitScopes ? requestedScopes.includes("write") : true,
  );

  const buildGrantedScopes = (): string | undefined => {
    if (!hasExplicitScopes) return undefined;
    const granted: string[] = [];
    for (const s of requestedScopes) {
      if (s === "write" && !writeEnabled) continue;
      granted.push(s);
    }
    return granted.join(" ");
  };

  const submitConsent = async (accept: boolean) => {
    try {
      setIsSubmitting(true);

      const body: Record<string, unknown> = {
        accept,
        oauth_query: oauthQuery,
      };

      const grantedScope = accept ? buildGrantedScopes() : undefined;
      if (grantedScope !== undefined) {
        body.scope = grantedScope;
      }

      const response = await fetch(`${authApiBase}/api/auth/oauth2/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | { redirect_uri?: string; url?: string; error?: string; message?: string }
        | Record<string, unknown>;

      if (!response.ok) {
        toast.error("Consent failed", {
          description: (payload as { message?: string }).message || (payload as { error?: string }).error || "Please try again.",
        });
        return;
      }

      const redirectUrl = (payload as { redirect_uri?: string; url?: string }).redirect_uri || (payload as { url?: string }).url;
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

  const renderScopeGroup = (key: ToggleableScope, opts: { alwaysOn?: boolean; checked: boolean; onToggle?: (v: boolean) => void }) => {
    const group = SCOPE_GROUPS[key];
    const Icon = group.icon;

    return (
      <div key={key} className="rounded-md border bg-muted/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-medium">{group.label}</span>
          </div>
          {opts.alwaysOn ? (
            <span className="shrink-0 text-xs text-muted-foreground">Required</span>
          ) : (
            <Checkbox
              checked={opts.checked}
              onCheckedChange={(v) => opts.onToggle?.(v === true)}
              aria-label={`Toggle ${group.label}`}
            />
          )}
        </div>
        <ul className="mt-2.5 grid gap-1.5 pl-6.5 text-sm text-muted-foreground">
          {group.capabilities.map((cap) => (
            <li key={cap} className="flex items-center gap-2">
              <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
              {cap}
            </li>
          ))}
        </ul>
      </div>
    );
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
            <CardTitle className="text-2xl">Authorize Access</CardTitle>
            <CardDescription>
              <span className="font-medium text-foreground">{clientName?.trim() || clientId}</span>
              {" "}is requesting access to your Guilders account.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {clientUri && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="break-all text-xs text-muted-foreground">{clientUri}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BookOpen className="h-4 w-4" />
              Permissions
            </div>

            <div className="space-y-3">
              {renderScopeGroup("read", { alwaysOn: true, checked: true })}
              {renderScopeGroup("write", { checked: writeEnabled, onToggle: setWriteEnabled })}
            </div>
          </div>

          <div className="space-y-2">
            {!writeEnabled && (
              <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <p className="text-xs font-medium text-primary">
                  Write access is disabled — the app will only be able to read your data.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              You can revoke this access at any time from your account settings.
            </p>
          </div>

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
