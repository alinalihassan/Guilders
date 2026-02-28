"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { FormMessage, type Message } from "@/components/common/form-message";
import { PasswordInput } from "@/components/common/password-input";
import { SubmitButton } from "@/components/common/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningInWithPasskey, setIsSigningInWithPasskey] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isVerifyingTwoFactor, setIsVerifyingTwoFactor] = useState(false);

  const message: Message = {
    message: searchParams.has("message") ? (searchParams.get("message") ?? "") : "",
    error: searchParams.has("error") ? (searchParams.get("error") ?? "") : "",
    success: searchParams.has("success") ? (searchParams.get("success") ?? "") : "",
  };

  const handleSubmit = async (formData: FormData) => {
    try {
      setIsLoading(true);
      const email = formData.get("email")?.toString();
      const password = formData.get("password")?.toString();
      if (!email || !password) {
        toast.error("Failed to sign in", {
          description: "Email and password are required.",
        });
        return;
      }

      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) {
        toast.error("Failed to sign in", {
          description: error.message || "Please try again.",
        });
        return;
      }

      if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
        setRequiresTwoFactor(true);
        return;
      }

      const redirectUrl = searchParams.get("redirect") || "/";
      router.push(redirectUrl);
    } catch {
      toast.error("Failed to sign in", {
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    if (twoFactorCode.length < 6) {
      toast.error("Invalid verification code", {
        description: "Enter the 6-digit code from your authenticator app.",
      });
      return;
    }
    try {
      setIsVerifyingTwoFactor(true);
      const { error } = await authClient.twoFactor.verifyTotp({
        code: twoFactorCode,
      });
      if (error) {
        toast.error("Invalid verification code", {
          description: error.message || "Please try again.",
        });
        return;
      }
      const redirectUrl = searchParams.get("redirect") || "/";
      router.push(redirectUrl);
    } catch {
      toast.error("Failed to verify code", {
        description: "Please try again.",
      });
    } finally {
      setIsVerifyingTwoFactor(false);
    }
  };

  const handlePasskeySignIn = async () => {
    try {
      setIsSigningInWithPasskey(true);
      const { data, error } = await authClient.signIn.passkey({ autoFill: false });
      if (error) {
        toast.error("Passkey sign-in failed", {
          description: error.message || "Please try again.",
        });
        return;
      }
      if (data) {
        const redirectUrl = searchParams.get("redirect") || "/";
        router.push(redirectUrl);
      }
    } catch (error) {
      toast.error("Passkey sign-in failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSigningInWithPasskey(false);
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

        <h1 className="text-center text-2xl font-bold">Sign In</h1>
        <p className="text-center text-muted-foreground">Please sign in to continue</p>

        <form className="mt-4 flex flex-col gap-4" action={handleSubmit}>
          <div className="grid gap-4">
            {requiresTwoFactor ? (
              <div className="contents" key="two-factor-step">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="twoFactorCode">Authenticator code</Label>
                  <Input
                    id="twoFactorCode"
                    name="twoFactorCode"
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(event) =>
                      setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                  />
                </div>
                <Button
                  type="button"
                  className="mt-2 w-full"
                  onClick={handleVerifyTwoFactor}
                  disabled={isVerifyingTwoFactor}
                >
                  {isVerifyingTwoFactor ? "Verifying..." : "Verify code"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isVerifyingTwoFactor}
                  onClick={() => {
                    setRequiresTwoFactor(false);
                    setTwoFactorCode("");
                  }}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
              <div className="contents" key="password-step">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="john@doe.com"
                    autoComplete="username webauthn"
                    required
                  />
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      className="text-xs leading-[14px] text-muted-foreground hover:text-foreground"
                      href="/forgot-password"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <PasswordInput
                    name="password"
                    placeholder="********"
                    required
                    autoComplete="current-password webauthn"
                  />
                </div>

                <SubmitButton
                  className="mt-2 w-full"
                  pendingText="Signing In..."
                  disabled={isLoading}
                >
                  Sign in
                </SubmitButton>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handlePasskeySignIn}
                  disabled={isSigningInWithPasskey || isLoading}
                >
                  {isSigningInWithPasskey ? "Waiting for passkey..." : "Sign in with passkey"}
                </Button>
              </div>
            )}
          </div>

          <FormMessage message={message} />

          <div className="flex justify-center gap-1 text-sm text-muted-foreground">
            <p>Don't have an account?</p>
            <Link href="/sign-up" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="w-full max-w-sm">
      <div className="animate-pulse rounded-md bg-background px-6 py-6 shadow">
        <div className="mb-4 flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-muted" />
        </div>
        <div className="mb-2 h-8 rounded bg-muted" />
        <div className="mx-auto mb-4 h-4 w-3/4 rounded bg-muted" />
        <div className="space-y-4">
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
