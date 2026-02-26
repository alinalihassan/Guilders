"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/common/password-input";
import { SubmitButton } from "@/components/common/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function OAuthSignInForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const oauthQuery = useMemo(() => searchParams.toString(), [searchParams]);
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
      <div className="rounded-md bg-background px-6 py-6 shadow">
        <div className="mb-4 flex flex-col items-center">
          <Image
            src="/assets/logo/logo_filled_rounded.svg"
            alt="logo"
            width={64}
            height={64}
            priority
          />
        </div>

        <h1 className="text-center text-2xl font-bold">MCP Sign In</h1>
        <p className="text-center text-muted-foreground">Sign in to continue OAuth authorization</p>

        <form className="mt-4 flex flex-col gap-4" action={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
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
                name="password"
                placeholder="********"
                required
                autoComplete="current-password"
              />
            </div>
            <SubmitButton className="mt-2 w-full" pendingText="Signing In..." disabled={isLoading}>
              Continue
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function OAuthSignInPage() {
  const searchParams = useSearchParams();

  const query = useMemo(() => searchParams.toString(), [searchParams]);
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

export default function OAuthSignIn() {
  return (
    <Suspense
      fallback={<div className="mx-auto mt-24 text-sm text-muted-foreground">Loading...</div>}
    >
      <OAuthSignInPage />
    </Suspense>
  );
}
