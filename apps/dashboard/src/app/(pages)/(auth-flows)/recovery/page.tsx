"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function RecoveryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordForm) => {
    try {
      setIsLoading(true);
      const token = new URLSearchParams(window.location.search).get("token");
      if (!token) {
        toast.error("Invalid reset link", {
          description: "Please request a new password reset email.",
        });
        return;
      }

      const { error } = await authClient.resetPassword({
        token,
        newPassword: data.password,
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
    <div className="flex min-h-screen items-center justify-center">
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

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
            <div className="grid gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
                {isLoading ? "Updating password..." : "Update Password"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
