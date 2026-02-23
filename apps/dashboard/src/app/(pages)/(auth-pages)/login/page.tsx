"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FormMessage, type Message } from "@/components/common/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { authApi } from "@/lib/auth-client";

function LoginForm() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [, setIsLoading] = useState(false);
	const [isSigningInWithPasskey, setIsSigningInWithPasskey] = useState(false);

	const message: Message = {
		message: searchParams.has("message")
			? (searchParams.get("message") ?? "")
			: "",
		error: searchParams.has("error") ? (searchParams.get("error") ?? "") : "",
		success: searchParams.has("success")
			? (searchParams.get("success") ?? "")
			: "",
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

			const { error } = await authApi.signInEmail({
				email,
				password,
			});
			if (error) {
				toast.error("Failed to sign in", {
					description: error.message || "Please try again.",
				});
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

	const handlePasskeySignIn = useCallback(
		async (autoFill = false) => {
			try {
				setIsSigningInWithPasskey(true);
				const { data, error } = await authApi.signInPasskey({ autoFill });
				if (error) {
					if (!autoFill) {
						toast.error("Passkey sign-in failed", {
							description: error.message || "Please try again.",
						});
					}
					return;
				}
				if (data) {
					const redirectUrl = searchParams.get("redirect") || "/";
					router.push(redirectUrl);
				}
			} finally {
				setIsSigningInWithPasskey(false);
			}
		},
		[router, searchParams],
	);

	useEffect(() => {
		const credentialApi = window.PublicKeyCredential as
			| (typeof PublicKeyCredential & {
					isConditionalMediationAvailable?: () => Promise<boolean>;
			  })
			| undefined;
		if (!credentialApi?.isConditionalMediationAvailable) return;

		credentialApi
			.isConditionalMediationAvailable()
			.then((isAvailable) => {
				if (isAvailable) handlePasskeySignIn(true);
			})
			.catch(() => undefined);
	}, [handlePasskeySignIn]);

	return (
		<div className="w-full max-w-sm">
			<div className="rounded-md bg-background px-6 py-6 shadow">
				<div className="flex flex-col items-center mb-4">
					<Image
						src="/assets/logo/logo_filled_rounded.svg"
						alt="logo"
						width={64}
						height={64}
						priority
					/>
				</div>

				<h1 className="text-2xl font-bold text-center">Sign In</h1>
				<p className="text-muted-foreground text-center">
					Please sign in to continue
				</p>

				<form className="flex flex-col gap-4 mt-4" action={handleSubmit}>
					<div className="grid gap-4">
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
							<div className="flex justify-between items-center">
								<Label htmlFor="password">Password</Label>
								<Link
									className="text-xs text-muted-foreground hover:text-foreground leading-[14px]"
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

						<SubmitButton className="mt-2 w-full" pendingText="Signing In...">
							Sign in
						</SubmitButton>
						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={() => handlePasskeySignIn()}
							disabled={isSigningInWithPasskey}
						>
							{isSigningInWithPasskey
								? "Waiting for passkey..."
								: "Sign in with passkey"}
						</Button>
					</div>

					<FormMessage message={message} />

					<div className="flex justify-center gap-1 text-sm text-muted-foreground">
						<p>Don't have an account?</p>
						<Link
							href="/sign-up"
							className="font-medium text-primary hover:underline"
						>
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
			<div className="rounded-md bg-background px-6 py-6 shadow animate-pulse">
				<div className="flex flex-col items-center mb-4">
					<div className="w-16 h-16 rounded-full bg-muted" />
				</div>
				<div className="h-8 bg-muted rounded mb-2" />
				<div className="h-4 bg-muted rounded w-3/4 mx-auto mb-4" />
				<div className="space-y-4">
					<div className="h-10 bg-muted rounded" />
					<div className="h-10 bg-muted rounded" />
					<div className="h-10 bg-muted rounded" />
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
