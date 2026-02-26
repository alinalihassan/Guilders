"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/common/password-input";
import { SubmitButton } from "@/components/common/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const DISPLAY_ONLY_QUERY_KEYS = new Set(["client_name", "client_uri"]);

const toOAuthQuery = (searchParams: ReturnType<typeof useSearchParams>) => {
  const params = new URLSearchParams(searchParams.toString());
  for (const key of DISPLAY_ONLY_QUERY_KEYS) {
    params.delete(key);
  }
  return params.toString();
};

function OAuthSignInForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const oauthQuery = useMemo(() => toOAuthQuery(searchParams), [searchParams]);
  const clientId = searchParams.get("client_id");
  const clientName = searchParams.get("client_name");
  const clientUri = searchParams.get("client_uri");
  const scope = searchParams.get("scope");
  const scopeList = useMemo(() => scope?.split(/\s+/).filter(Boolean).slice(0, 6) ?? [], [scope]);
  const authApiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  const authorizeUrl = `${authApiBase}/api/auth/oauth2/authorize${oauthQuery ? `?${oauthQuery}` : ""}`;

  const handleSubmit = async (formData: FormData) => {
    try {
      setIsLoading(true);
      const email = formData.get("email")?.toString();
      const password = formData.get("password")?.toString();
      if (!email || !password) {
        toast.error("Sign-in failed", {
          description: "Email and password are required.",
        });
        return;
      }

      const { error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) {
        toast.error("Sign-in failed", {
          description: error.message || "Please try again.",
        });
        return;
      }

      window.location.href = authorizeUrl;
    } catch {
      toast.error("Sign-in failed", {
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <Card className="border bg-background shadow-md">
        <CardHeader className="space-y-3 pb-3">
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
            <CardTitle className="text-2xl">MCP Sign In</CardTitle>
            <CardDescription>Sign in to continue OAuth authorization</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {(clientId || scopeList.length > 0) && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Authorization details
              </div>
              {clientId && (
                <div className="text-xs text-muted-foreground">
                  Client:{" "}
                  <span className="font-medium text-foreground">
                    {clientName?.trim() || clientId}
                  </span>
                </div>
              )}
              {clientUri && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Origin: <span className="break-all text-foreground">{clientUri}</span>
                </div>
              )}
              {scopeList.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {scopeList.map((item) => (
                    <Badge key={item} variant="secondary" className="rounded-md">
                      {item}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <form className="flex flex-col gap-4" action={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@doe.com"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="********"
                  required
                  autoComplete="current-password"
                />
              </div>
              <SubmitButton
                className="mt-2 w-full"
                pendingText="Signing In..."
                disabled={isLoading}
              >
                Continue
              </SubmitButton>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <KeyRound className="h-3.5 w-3.5" />
                Secure redirect
              </div>
              You will be redirected back to the requesting application after sign in.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function OAuthSignInPage() {
  const searchParams = useSearchParams();

  const query = useMemo(() => toOAuthQuery(searchParams), [searchParams]);
  const authApiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  const authorizeUrl = `${authApiBase}/api/auth/oauth2/authorize${query ? `?${query}` : ""}`;

  useEffect(() => {
    // If user already has a session cookie, Better Auth will immediately continue OAuth.
    void (async () => {
      try {
        const response = await fetch(`${authApiBase}/api/auth/get-session`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { user?: { id: string } | null } | null;
        if (payload?.user?.id) {
          window.location.href = authorizeUrl;
        }
      } catch {
        // Keep user on sign-in form if session check fails.
      }
    })();
  }, [authApiBase, authorizeUrl]);

  return <OAuthSignInForm />;
}

function OAuthSignInSkeleton() {
  return (
    <div className="w-full max-w-sm">
      <Card className="animate-pulse border bg-background shadow-md">
        <CardHeader className="pb-3">
          <Image
            src="/assets/logo/logo_filled_rounded.svg"
            alt="logo"
            width={64}
            height={64}
            priority
            className="mx-auto opacity-30"
          />
          <div className="mx-auto h-6 w-36 rounded bg-muted" />
          <div className="mx-auto h-4 w-56 rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-16 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function OAuthSignIn() {
  return (
    <Suspense fallback={<OAuthSignInSkeleton />}>
      <OAuthSignInPage />
    </Suspense>
  );
}
