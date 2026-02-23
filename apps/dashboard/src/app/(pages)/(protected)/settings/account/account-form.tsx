"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ThemeSelector } from "@/components/settings/theme-selector";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useCurrencies } from "@/lib/queries/useCurrencies";
import {
	useDeleteAccount,
	useUpdateUserSettings,
	useUser,
} from "@/lib/queries/useUser";

const accountFormSchema = z.object({
	email: z.string().email(),
	currency: z.string({
		required_error: "Please select a currency.",
	}),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;
const customOrder = ["EUR", "GBP", "USD"];

export function AccountForm() {
	const router = useRouter();
	const [isDeletingAccount, setIsDeletingAccount] = useState(false);
	const { mutateAsync: deleteAccount } = useDeleteAccount();

	const { data: user, isLoading: isUserLoading, error: userError } = useUser();
	const { mutateAsync: updateUserSettings } = useUpdateUserSettings();

	const {
		data: currencies,
		isLoading: isCurrenciesLoading,
		error: currenciesError,
	} = useCurrencies();

	const form = useForm<AccountFormValues>({
		resolver: zodResolver(accountFormSchema),
		defaultValues: {
			email: user?.email ?? "",
			currency: user?.settings.currency ?? "",
		},
	});

	useEffect(() => {
		if (user?.email) {
			form.reset(
				{
					email: user.email,
					currency: user.settings.currency,
				},
				{
					keepDirtyValues: true,
				},
			);
		}
	}, [user, form]);

	const sortedCurrencies = useMemo(() => {
		if (!currencies) return [];

		const orderedCurrencies = customOrder
			.map((code) => currencies.find((c) => c.code === code))
			.filter((c): c is NonNullable<typeof c> => c !== undefined);

		const remainingCurrencies = currencies
			.filter((c) => !customOrder.includes(c.code))
			.sort((a, b) => a.code.localeCompare(b.code));

		return [...orderedCurrencies, ...remainingCurrencies];
	}, [currencies]);

	const handleDeleteAccount = async () => {
		setIsDeletingAccount(true);
		try {
			await deleteAccount();
			router.push("/");
		} catch (_error) {
			toast.error("Error deleting account", {
				description: "Something went wrong. Please contact us for support.",
			});
			setIsDeletingAccount(false);
		}
	};

	if (isUserLoading || isCurrenciesLoading) {
		return (
			<div className="flex items-center justify-center py-6">Loading...</div>
		);
	}

	if (userError) {
		return (
			<div className="text-destructive">
				Error loading user data. Please try again later.
			</div>
		);
	}

	if (currenciesError) {
		return (
			<div className="text-destructive">
				Error loading currencies. Please try again later.
			</div>
		);
	}

	async function onSubmit(data: AccountFormValues) {
		try {
			const isEmailChanged = data.email !== user?.email;

			await updateUserSettings({
				...(isEmailChanged ? { email: data.email } : {}),
				settings: { currency: data.currency },
			});

			if (isEmailChanged) {
				toast.success("Email verification sent", {
					description: "Please check your email for a verification link.",
				});
			} else {
				toast.success("Account updated", {
					description: "Your account has been updated successfully.",
				});
			}
		} catch (_error) {
			toast.error("Failed to update account", {
				description: "Please try again.",
			});
		}
	}

	const deleteAccountButton = (
		<div className="mt-6 border-t pt-6">
			<h2 className="text-destructive font-semibold">Danger Zone</h2>
			<p className="text-sm text-muted-foreground mt-2">
				Once you delete your account, there is no going back. Please be certain.
			</p>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button variant="destructive" className="mt-4">
						Delete Account
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will:
						</AlertDialogDescription>
						<ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
							<li>Permanently delete your account</li>
							<li>Remove all your connections to financial institutions</li>
							<li>Delete all your stored data</li>
							<li>Cancel any active subscriptions</li>
						</ul>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeletingAccount}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleDeleteAccount();
							}}
							disabled={isDeletingAccount}
							className="bg-destructive hover:bg-destructive/90"
						>
							{isDeletingAccount ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete Account"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input placeholder="Your email" {...field} />
							</FormControl>
							<FormDescription>
								This is the email that will be used to login to your account.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="currency"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Currency</FormLabel>
							<Select
								onValueChange={field.onChange}
								defaultValue={field.value}
								value={field.value}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select currency">
											{field.value}
										</SelectValue>
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{sortedCurrencies.map((currency) => (
										<SelectItem key={currency.code} value={currency.code}>
											{currency.code} - {currency.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormDescription>
								This is the currency that will be used for your account.
							</FormDescription>
							<p className="text-xs text-muted-foreground">
								TODO: Currency preference is temporarily defaulted to USD until
								backend settings persistence is fully migrated.
							</p>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button
					type="submit"
					disabled={!form.formState.isDirty || form.formState.isSubmitting}
				>
					{form.formState.isSubmitting ? "Updating..." : "Update account"}
				</Button>
			</form>
			<div className="border-t pt-6">
				<ThemeSelector />
			</div>
			{deleteAccountButton}
		</Form>
	);
}
