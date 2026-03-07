
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { SubmitButton } from "@/components/common/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { clientEnv } from "@/lib/env";

export const Route = createFileRoute("/(pages)/(auth-pages)/forgot-password/")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const handleSubmit = async (formData: FormData) => {
    const email = formData.get("email")?.toString();
    if (!email) {
      toast.error("Email is required");
      return;
    }

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${clientEnv.VITE_DASHBOARD_URL}/recovery`,
    });
    if (error) {
      toast.error("Failed to send reset link", {
        description: error.message || "Please try again.",
      });
      return;
    }

    toast.success("Reset link sent", {
      description: "Check your email for password reset instructions.",
    });
  };

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-lg border bg-card px-6 py-6 text-card-foreground shadow-sm">
        <div className="mb-4 flex flex-col items-center">
          <img src="/assets/logo/logo_filled_rounded.svg" alt="" width={64} height={64} />
        </div>

        <h1 className="text-center text-2xl font-bold">Reset Password</h1>
        <p className="text-center text-muted-foreground">
          Enter your email to receive a reset link
        </p>

        <form className="mt-4 flex flex-col gap-4" action={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input name="email" type="email" placeholder="john@doe.com" required />
            </div>

            <SubmitButton className="mt-2 w-full" pendingText="Sending Reset Link...">
              Send Reset Link
            </SubmitButton>
          </div>

          <div className="flex justify-center gap-1 text-sm text-muted-foreground">
            <p>Remember your password?</p>
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
