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
import { useAuthStore } from "@/lib/store/authStore";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    isLoading,
    setIsLoading,
    isSigningInWithPasskey,
    setIsSigningInWithPasskey,
    requiresTwoFactor,
    setRequiresTwoFactor,
    twoFactorMethod,
    setTwoFactorMethod,
    twoFactorCode,
    setTwoFactorCode,
    isVerifyingTwoFactor,
    setIsVerifyingTwoFactor,
  } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const message: Message = {
    message: searchParams.has("message") ? (searchParams.get("message") ?? "") : "",
    error: searchParams.has("error") ? (searchParams.get("error") ?? "") : "",
    success: searchParams.has("success") ? (searchParams.get("success") ?? "") : "",
  };

  const handleSubmit = async (formData: FormData) => {
    try {
      setIsLoading(true);
      const submittedEmail = formData.get("email")?.toString() ?? email;
      const submittedPassword = formData.get("password")?.toString() ?? password;
      const normalizedEmail = submittedEmail.trim();
      if (!normalizedEmail || !submittedPassword) {
        toast.error("Failed to sign in", {
          description: "Email and password are required.",
        });
        return;
      }
      setEmail(normalizedEmail);
      setPassword(submittedPassword);

      const { data, error } = await authClient.signIn.email({
        email: normalizedEmail,
        password: submittedPassword,
      });
      if (error) {
        toast.error("Failed to sign in", {
          description: error.message || "Please try again.",
        });
        return;
      }

      if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
        setRequiresTwoFactor(true);
        setTwoFactorMethod("totp");
        setTwoFactorCode("");
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
    const normalizedCode = twoFactorMethod === "totp" ? twoFactorCode : twoFactorCode.trim();
    if (!normalizedCode || (twoFactorMethod === "totp" && normalizedCode.length < 6)) {
      toast.error(
        twoFactorMethod === "totp" ? "Invalid verification code" : "Invalid backup code",
        {
          description:
            twoFactorMethod === "totp"
              ? "Enter the 6-digit code from your authenticator app."
              : "Enter one of your backup codes.",
        },
      );
      return;
    }
    try {
      setIsVerifyingTwoFactor(true);
      const { error } =
        twoFactorMethod === "totp"
          ? await authClient.twoFactor.verifyTotp({ code: normalizedCode })
          : await authClient.twoFactor.verifyBackupCode({ code: normalizedCode });
      if (error) {
        toast.error(
          twoFactorMethod === "totp" ? "Invalid verification code" : "Invalid backup code",
          {
            description: error.message || "Please try again.",
          },
        );
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
                  <Label htmlFor="twoFactorCode">
                    {twoFactorMethod === "totp" ? "Authenticator code" : "Backup code"}
                  </Label>
                  <Input
                    id="twoFactorCode"
                    name="twoFactorCode"
                    placeholder={twoFactorMethod === "totp" ? "123456" : "Enter backup code"}
                    inputMode={twoFactorMethod === "totp" ? "numeric" : "text"}
                    autoComplete={twoFactorMethod === "totp" ? "one-time-code" : "off"}
                    value={twoFactorCode}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleVerifyTwoFactor();
                      }
                    }}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTwoFactorCode(
                        twoFactorMethod === "totp" ? value.replace(/\D/g, "").slice(0, 6) : value,
                      );
                    }}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    disabled={isVerifyingTwoFactor}
                    onClick={() => {
                      setTwoFactorMethod(twoFactorMethod === "totp" ? "backup" : "totp");
                      setTwoFactorCode("");
                    }}
                  >
                    {twoFactorMethod === "totp"
                      ? "Use a backup code instead"
                      : "Use authenticator code instead"}
                  </Button>
                </div>
                <Button
                  type="button"
                  className="mt-2 w-full"
                  onClick={handleVerifyTwoFactor}
                  disabled={isVerifyingTwoFactor}
                >
                  {isVerifyingTwoFactor
                    ? "Verifying..."
                    : twoFactorMethod === "totp"
                      ? "Verify code"
                      : "Verify backup code"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isVerifyingTwoFactor}
                  onClick={() => {
                    setRequiresTwoFactor(false);
                    setTwoFactorMethod("totp");
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
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@doe.com"
                    autoComplete="username webauthn"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
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
                    id="password"
                    name="password"
                    placeholder="********"
                    required
                    autoComplete="current-password webauthn"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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
