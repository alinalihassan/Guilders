"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/common/password-input";
import { SubmitButton } from "@/components/common/submit-button";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function RecoveryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    try {
      setIsLoading(true);
      const password = formData.get("password")?.toString();
      const confirmPassword = formData.get("confirmPassword")?.toString();
      if (!password || !confirmPassword) {
        toast.error("Failed to update password", {
          description: "Both password fields are required.",
        });
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Failed to update password", {
          description: "Passwords don't match.",
        });
        return;
      }

      const token = new URLSearchParams(window.location.search).get("token");
      if (!token) {
        toast.error("Invalid reset link", {
          description: "Please request a new password reset email.",
        });
        return;
      }

      const { error } = await authClient.resetPassword({
        token,
        newPassword: password,
      });
      if (error) {
        toast.error("Failed to update password", {
          description: error.message || "Please try again.",
        });
        return;
      }

      toast.success("Password updated", {
        description: "You can now sign in with your new password.",
      });
      router.push("/login");
    } catch {
      toast.error("Failed to update password", {
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

        <h1 className="text-center text-2xl font-bold">Reset Password</h1>
        <p className="text-center text-muted-foreground">Please enter your new password</p>

        <form className="mt-4 flex flex-col gap-4" action={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="password">New Password</Label>
              <PasswordInput
                name="password"
                placeholder="********"
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput
                name="confirmPassword"
                placeholder="********"
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
            </div>

            <SubmitButton
              className="mt-2 w-full"
              pendingText="Updating Password..."
              disabled={isLoading}
            >
              Update Password
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
