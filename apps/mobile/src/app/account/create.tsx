import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	useColorScheme,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import { api } from "@/lib/api";

type ColorSet = (typeof Colors)["light"] | (typeof Colors)["dark"];

// ─── Types ───────────────────────────────────────────────────────────────────

type AccountSubtype =
	| "depository"
	| "brokerage"
	| "crypto"
	| "property"
	| "vehicle"
	| "creditcard"
	| "loan"
	| "stock";

interface AccountFormData {
	name: string;
	subtype: AccountSubtype;
	value: string;
	currency: string;
	notes: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCOUNT_SUBTYPES: { value: AccountSubtype; label: string; icon: string; isLiability: boolean }[] = [
	{ value: "depository", label: "Bank Account", icon: "🏦", isLiability: false },
	{ value: "brokerage", label: "Investment", icon: "📈", isLiability: false },
	{ value: "crypto", label: "Crypto", icon: "₿", isLiability: false },
	{ value: "property", label: "Property", icon: "🏠", isLiability: false },
	{ value: "vehicle", label: "Vehicle", icon: "🚗", isLiability: false },
	{ value: "stock", label: "Stock", icon: "📊", isLiability: false },
	{ value: "creditcard", label: "Credit Card", icon: "💳", isLiability: true },
	{ value: "loan", label: "Loan", icon: "📄", isLiability: true },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY"];

// ─── Components ──────────────────────────────────────────────────────────────

function InputField({
	label,
	value,
	onChangeText,
	placeholder,
	keyboardType = "default",
	colors,
}: {
	label: string;
	value: string;
	onChangeText: (text: string) => void;
	placeholder?: string;
	keyboardType?: "default" | "numeric" | "email-address";
	colors: ColorSet;
}) {
	return (
		<View style={{ marginBottom: Spacing.three }}>
			<Text
				style={{
					fontSize: 13,
					fontWeight: "600",
					color: colors.textSecondary,
					textTransform: "uppercase",
					letterSpacing: 0.5,
					marginBottom: Spacing.one,
				}}>
				{label}
			</Text>
			<TextInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor={colors.textSecondary}
				keyboardType={keyboardType}
				style={{
					fontSize: 16,
					color: colors.text,
					paddingVertical: Spacing.two,
					paddingHorizontal: Spacing.three,
					backgroundColor: colors.backgroundElement,
					borderRadius: 12,
				}}
			/>
		</View>
	);
}

function SubtypeSelector({
	selected,
	onSelect,
	colors,
}: {
	selected: AccountSubtype | null;
	onSelect: (subtype: AccountSubtype) => void;
	colors: ColorSet;
}) {
	return (
		<View style={{ marginBottom: Spacing.three }}>
			<Text
				style={{
					fontSize: 13,
					fontWeight: "600",
					color: colors.textSecondary,
					textTransform: "uppercase",
					letterSpacing: 0.5,
					marginBottom: Spacing.two,
				}}>
				Account Type
			</Text>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.two }}>
				{ACCOUNT_SUBTYPES.map((subtype) => (
					<Pressable
						key={subtype.value}
						onPress={() => onSelect(subtype.value)}
						style={({ pressed }) => ({
							flexDirection: "row",
							alignItems: "center",
							gap: Spacing.one,
							paddingVertical: Spacing.two,
							paddingHorizontal: Spacing.three,
							backgroundColor:
								selected === subtype.value
									? colors.text
									: colors.backgroundElement,
							borderRadius: 24,
							opacity: pressed ? 0.8 : 1,
						})}>
						<Text style={{ fontSize: 16 }}>{subtype.icon}</Text>
						<Text
							style={{
								fontSize: 14,
								fontWeight: selected === subtype.value ? "600" : "400",
								color:
									selected === subtype.value ? colors.background : colors.text,
							}}>
							{subtype.label}
						</Text>
					</Pressable>
				))}
			</View>
		</View>
	);
}

function CurrencySelector({
	selected,
	onSelect,
	colors,
}: {
	selected: string;
	onSelect: (currency: string) => void;
	colors: ColorSet;
}) {
	return (
		<View style={{ marginBottom: Spacing.three }}>
			<Text
				style={{
					fontSize: 13,
					fontWeight: "600",
					color: colors.textSecondary,
					textTransform: "uppercase",
					letterSpacing: 0.5,
					marginBottom: Spacing.two,
				}}>
				Currency
			</Text>
			<View style={{ flexDirection: "row", gap: Spacing.two }}>
				{CURRENCIES.map((currency) => (
					<Pressable
						key={currency}
						onPress={() => onSelect(currency)}
						style={({ pressed }) => ({
							paddingVertical: Spacing.two,
							paddingHorizontal: Spacing.three,
							backgroundColor:
								selected === currency
									? colors.text
									: colors.backgroundElement,
							borderRadius: 12,
							opacity: pressed ? 0.8 : 1,
						})}>
						<Text
							style={{
								fontSize: 14,
								fontWeight: selected === currency ? "600" : "400",
								color:
									selected === currency ? colors.background : colors.text,
							}}>
							{currency}
						</Text>
					</Pressable>
				))}
			</View>
		</View>
	);
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CreateAccountScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
	const insets = useSafeAreaInsets();

	const [formData, setFormData] = useState<AccountFormData>({
		name: "",
		subtype: "depository",
		value: "",
		currency: "EUR",
		notes: "",
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const updateField = useCallback(
		<K extends keyof AccountFormData>(field: K, value: AccountFormData[K]) => {
			setFormData((prev) => ({ ...prev, [field]: value }));
		},
		[]
	);

	const handleSubmit = useCallback(async () => {
		if (!formData.name.trim()) {
			setError("Please enter an account name");
			return;
		}

		if (!formData.value.trim() || isNaN(parseFloat(formData.value))) {
			setError("Please enter a valid value");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			await api.post("/api/account", {
				name: formData.name.trim(),
				subtype: formData.subtype,
				value: parseFloat(formData.value),
				currency: formData.currency,
				notes: formData.notes.trim(),
			});

			router.back();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to create account");
		} finally {
			setIsSubmitting(false);
		}
	}, [formData]);

	const isLiability = ACCOUNT_SUBTYPES.find((s) => s.value === formData.subtype)?.isLiability;

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			{/* Header */}
			<View
				style={{
					padding: Spacing.four,
					backgroundColor: colors.background,
				}}>
				{/* Top row: close button */}
				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: Spacing.four,
					}}>
					<Pressable
						onPress={() => router.back()}
						style={({ pressed }) => ({
							width: 36,
							height: 36,
							borderRadius: 18,
							backgroundColor: colors.backgroundElement,
							justifyContent: "center",
							alignItems: "center",
							opacity: pressed ? 0.7 : 1,
						})}>
						<Image
							source="sf:xmark"
							style={{ width: 16, height: 16, tintColor: colors.text }}
						/>
					</Pressable>
				</View>

				{/* Title */}
				<Text
					style={{
						fontSize: 28,
						fontWeight: "700",
						color: colors.text,
						fontFamily: Fonts?.rounded,
					}}>
					Add Manual Account
				</Text>
				<Text
					style={{
						fontSize: 15,
						color: colors.textSecondary,
						marginTop: Spacing.one,
					}}>
					Track your personal finances manually
				</Text>
			</View>

			<ScrollView
				style={{ flex: 1 }}
				contentContainerStyle={{
					paddingHorizontal: Spacing.four,
					paddingBottom: insets.bottom + Spacing.six,
				}}>
				{/* Form */}
				<View
					style={{
						backgroundColor: colors.backgroundElement,
						borderRadius: 16,
						padding: Spacing.three,
						marginBottom: Spacing.three,
					}}>
					<Text
						style={{
							fontSize: 13,
							fontWeight: "600",
							color: colors.textSecondary,
							textTransform: "uppercase",
							letterSpacing: 0.5,
							marginBottom: Spacing.two,
						}}>
						Account Details
					</Text>

					<InputField
						label="Name"
						value={formData.name}
						onChangeText={(text) => updateField("name", text)}
						placeholder="e.g., Cash under mattress"
						colors={colors}
					/>

					<SubtypeSelector
						selected={formData.subtype}
						onSelect={(subtype) => updateField("subtype", subtype)}
						colors={colors}
					/>

					<InputField
						label={isLiability ? "Balance (negative value)" : "Current Value"}
						value={formData.value}
						onChangeText={(text) => updateField("value", text)}
						placeholder="0.00"
						keyboardType="numeric"
						colors={colors}
					/>

					<CurrencySelector
						selected={formData.currency}
						onSelect={(currency) => updateField("currency", currency)}
						colors={colors}
					/>

					<InputField
						label="Notes (Optional)"
						value={formData.notes}
						onChangeText={(text) => updateField("notes", text)}
						placeholder="Any additional details..."
						colors={colors}
					/>
				</View>

				{/* Error message */}
				{error && (
					<View
						style={{
							backgroundColor: "#EF444420",
							borderRadius: 12,
							padding: Spacing.three,
							marginBottom: Spacing.three,
						}}>
						<Text
							style={{
								fontSize: 14,
								color: "#EF4444",
								textAlign: "center",
							}}>
							{error}
						</Text>
					</View>
				)}

				{/* Submit Button */}
				<Pressable
					onPress={handleSubmit}
					disabled={isSubmitting}
					style={({ pressed }) => ({
						backgroundColor: colors.text,
						borderRadius: 16,
						paddingVertical: Spacing.three,
						alignItems: "center",
						opacity: pressed || isSubmitting ? 0.8 : 1,
					})}>
					{isSubmitting ? (
						<ActivityIndicator color={colors.background} />
					) : (
						<Text
							style={{
								fontSize: 16,
								fontWeight: "600",
								color: colors.background,
							}}>
							Create Account
						</Text>
					)}
				</Pressable>
			</ScrollView>
		</View>
	);
}
