"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PasswordInput } from "@/components/common/password-input";
import { SubmitButton } from "@/components/common/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function Signup() {
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      toast.error("Failed to create account", {
        description: "Email and password are required.",
      });
      return;
    }

    const { error } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0] ?? "User",
    });
    if (error) {
      toast.error("Failed to create account", {
        description: error.message || "Please try again.",
      });
      return;
    }

    toast.success("Account created successfully");
    router.push("/");
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

        <h1 className="text-center text-2xl font-bold">Create Account</h1>
        <p className="text-center text-muted-foreground">Sign up to get started</p>

        <form className="mt-4 flex flex-col gap-4" action={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input name="email" type="email" placeholder="john@doe.com" required />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                name="password"
                placeholder="********"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <SubmitButton className="mt-2 w-full" pendingText="Creating account...">
              Create account
            </SubmitButton>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By continuing to sign up, you agree to our
            <br />
            <Link href="/terms-of-service" className="font-medium text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>

          <div className="flex justify-center gap-1 text-xs text-muted-foreground">
            <p>Already have an account?</p>
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
