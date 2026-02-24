import { Image } from 'expo-image';
import { Link, router } from "expo-router";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Animated,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import {
	type Asset,
	type Transaction,
	useAssets,
	useTransactions,
} from "@/hooks/use-dashboard";

type ColorSet = (typeof Colors)["light"] | (typeof Colors)["dark"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency = "EUR"): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

function formatTransactionAmount(amount: string, currency: string): string {
	const num = parseFloat(amount);
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		signDisplay: "always",
	}).format(num);
}

function formatDateShort(dateStr: string): string {
	const date = new Date(dateStr);
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (date.toDateString() === today.toDateString()) return "Today";
	if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getCategoryIcon(category: string): string {
	const map: Record<string, string> = {
		food: "🍔",
		transport: "🚗",
		shopping: "🛍️",
		entertainment: "🎬",
		health: "🏥",
		travel: "✈️",
		utilities: "💡",
		income: "💰",
		transfer: "↔️",
		uncategorized: "📋",
	};
	return map[category.toLowerCase()] ?? "📋";
}

function getAssetIcon(subtype: string): string {
	const map: Record<string, string> = {
		depository: "🏦",
		brokerage: "📈",
		crypto: "₿",
		property: "🏠",
		vehicle: "🚗",
		creditcard: "💳",
		loan: "📄",
		stock: "📊",
	};
	return map[subtype.toLowerCase()] ?? "💰";
}

// ─── Components ──────────────────────────────────────────────────────────────

function Sparkline({ color }: { color: string }) {
	// Simple SVG sparkline - in a real app you'd use actual data
	return (
		<View style={{ height: 40, marginTop: Spacing.three }}>
			<svg width="100%" height="40" viewBox="0 0 300 40" preserveAspectRatio="none">
				<path
					d="M0,35 Q30,30 60,32 T120,25 T180,28 T240,20 T300,15"
					fill="none"
					stroke={color}
					strokeWidth="2"
					strokeLinecap="round"
				/>
			</svg>
		</View>
	);
}

function TimeSelector({
	selected,
	onSelect,
	colors,
}: {
	selected: string;
	onSelect: (period: string) => void;
	colors: ColorSet;
}) {
	const periods = ["1D", "1W", "1M", "6M", "1Y"];

	return (
		<View
			style={{
				flexDirection: "row",
				justifyContent: "center",
				gap: Spacing.four,
				marginTop: Spacing.three,
			}}>
			{periods.map((period) => (
				<Pressable
					key={period}
					onPress={() => onSelect(period)}
					style={{
						paddingVertical: Spacing.one,
						paddingHorizontal: Spacing.two,
					}}>
					<Text
						style={{
							fontSize: 13,
							fontWeight: selected === period ? "600" : "400",
							color: selected === period ? colors.text : colors.textSecondary,
						}}>
						{period}
					</Text>
				</Pressable>
			))}
		</View>
	);
}

function AssetCard({
	asset,
	colors,
}: {
	asset: Asset;
	colors: ColorSet;
}) {
	const value = parseFloat(asset.value);

	return (
		<Pressable
			style={{
				flex: 1,
				backgroundColor: colors.backgroundElement,
				borderRadius: 16,
				padding: Spacing.three,
				minHeight: 100,
			}}>
			<View
				style={{
					width: 40,
					height: 40,
					borderRadius: 10,
					backgroundColor: colors.backgroundSelected,
					justifyContent: "center",
					alignItems: "center",
					marginBottom: Spacing.two,
				}}>
				<Text style={{ fontSize: 20 }}>{getAssetIcon(asset.subtype)}</Text>
			</View>
			<Text
				style={{
					fontSize: 13,
					color: colors.textSecondary,
					marginBottom: Spacing.one,
				}}>
				{asset.name}
			</Text>
			<Text
				style={{
					fontSize: 17,
					fontWeight: "600",
					color: colors.text,
					fontVariant: ["tabular-nums"],
				}}>
				{formatCurrency(value, asset.currency)}
			</Text>
		</Pressable>
	);
}

function AddAssetCard({
	colors,
}: {
	colors: ColorSet;
}) {
	return (
		<Pressable
			onPress={() => router.push("/asset/create")}
			style={({ pressed }) => ({
				flex: 1,
				backgroundColor: colors.backgroundElement,
				borderRadius: 16,
				padding: Spacing.three,
				minHeight: 100,
				justifyContent: "center",
				alignItems: "center",
				borderWidth: 2,
				borderColor: colors.backgroundSelected,
				borderStyle: "dashed",
				opacity: pressed ? 0.7 : 1,
			})}>
			<View
				style={{
					width: 40,
					height: 40,
					borderRadius: 10,
					backgroundColor: colors.backgroundSelected,
					justifyContent: "center",
					alignItems: "center",
					marginBottom: Spacing.two,
				}}>
				<Text style={{ fontSize: 24, color: colors.textSecondary }}>+</Text>
			</View>
			<Text
				style={{
					fontSize: 13,
					color: colors.textSecondary,
					fontWeight: "500",
				}}>
				Add Asset
			</Text>
		</Pressable>
	);
}

function TransactionRow({
	item,
	colors,
	isLast,
}: {
	item: Transaction;
	colors: ColorSet;
	isLast: boolean;
}) {
	const amount = parseFloat(item.amount);
	const isPositive = amount >= 0;
	const formattedAmount = formatTransactionAmount(item.amount, item.currency);

	return (
		<Link href={`/transaction/${item.id}`} asChild>
			<Pressable
				style={({ pressed }) => ({
					flexDirection: "row",
					alignItems: "center",
					paddingVertical: Spacing.two + 2,
					gap: Spacing.three,
					borderBottomWidth: isLast ? 0 : 0.5,
					borderBottomColor: colors.backgroundElement,
					opacity: pressed ? 0.7 : 1,
				})}>
				<View
					style={{
						width: 44,
						height: 44,
						borderRadius: 14,
						borderCurve: "continuous",
						backgroundColor: colors.backgroundElement,
						justifyContent: "center",
						alignItems: "center",
					}}>
					<Text style={{ fontSize: 20 }}>{getCategoryIcon(item.category)}</Text>
				</View>
				<View style={{ flex: 1, gap: 2 }}>
					<Text
						numberOfLines={1}
						style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
						{item.description}
					</Text>
					<Text style={{ fontSize: 13, color: colors.textSecondary }}>
						{formatDateShort(item.date)} · {item.category}
					</Text>
				</View>
				<Text
					style={{
						fontSize: 15,
						fontWeight: "600",
						color: isPositive ? "#22C55E" : colors.text,
						fontVariant: ["tabular-nums"],
					}}>
					{formattedAmount}
				</Text>
			</Pressable>
		</Link>
	);
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HomeScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
	const insets = useSafeAreaInsets();

	const { data: assets, totalValue, loading: assetsLoading, refetch: refetchAssets } = useAssets();
	const { data: transactions, loading: txLoading, refetch: refetchTx } = useTransactions();

	const [selectedPeriod, setSelectedPeriod] = useState("1M");

	const assetsList = assets ?? [];

	const onRefresh = useCallback(async () => {
		await Promise.all([refetchAssets(), refetchTx()]);
	}, [refetchAssets, refetchTx]);

	const isLoading = assetsLoading && txLoading;

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: colors.background }}
			contentInsetAdjustmentBehavior="automatic"
			refreshControl={
				<RefreshControl
					refreshing={isLoading}
					onRefresh={onRefresh}
					tintColor={colors.textSecondary}
				/>
			}
			contentContainerStyle={{
				paddingBottom: insets.bottom + Spacing.six,
			}}>
			{/* Balance Section */}
			<View style={{ paddingHorizontal: Spacing.four, marginTop: Spacing.four }}>
				<View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two }}>
					<Text style={{ fontSize: 15, color: colors.textSecondary }}>
						Total Balance
					</Text>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							backgroundColor: "#22C55E20",
							paddingHorizontal: Spacing.two,
							paddingVertical: 2,
							borderRadius: 12,
						}}>
						<Image
							source="sf:arrow.up.forward"
							style={{ width: 12, height: 12, tintColor: "#22C55E" }}
						/>
						<Text style={{ fontSize: 13, color: "#22C55E", fontWeight: "600" }}>
							12.5%
						</Text>
					</View>
				</View>

				{/* Large Amount */}
				{assetsLoading ? (
					<ActivityIndicator size="large" color={colors.textSecondary} style={{ marginTop: Spacing.two }} />
				) : (
					<Text
						style={{
							fontSize: 48,
							fontWeight: "700",
							color: colors.text,
							fontFamily: Fonts?.rounded,
							marginTop: Spacing.one,
							fontVariant: ["tabular-nums"],
						}}>
						{formatCurrency(totalValue)}
					</Text>
				)}

				{/* Simple sparkline placeholder */}
				<View
					style={{
						height: 60,
						marginTop: Spacing.three,
						flexDirection: "row",
						alignItems: "flex-end",
						gap: 2,
						opacity: 0.3,
					}}>
					{[40, 35, 45, 30, 50, 40, 55, 45, 60, 50, 65, 55, 70, 60, 75, 65, 80, 70, 85, 75].map((h, i) => (
						<View
							key={i}
							style={{
								flex: 1,
								height: `${h}%`,
								backgroundColor: colors.text,
								borderRadius: 1,
								minHeight: 4,
							}}
						/>
					))}
				</View>

				{/* Time Selector */}
				<TimeSelector
					selected={selectedPeriod}
					onSelect={setSelectedPeriod}
					colors={colors}
				/>
			</View>

			{/* Assets Grid - 2 columns */}
			<View style={{ paddingHorizontal: Spacing.four, marginTop: Spacing.five }}>
				<Text
					style={{
						fontSize: 20,
						fontWeight: "700",
						color: colors.text,
						marginBottom: Spacing.three,
						fontFamily: Fonts?.rounded,
					}}>
					Assets
				</Text>
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.two }}>
					{assetsLoading ? (
						<ActivityIndicator size="large" color={colors.textSecondary} style={{ flex: 1, marginTop: Spacing.four }} />
					) : (
						<>
							{assetsList.map((asset) => (
								<View key={asset.id} style={{ width: "48%" }}>
									<AssetCard asset={asset} colors={colors} />
								</View>
							))}
							<View style={{ width: "48%" }}>
								<AddAssetCard colors={colors} />
							</View>
						</>
					)}
				</View>
			</View>
		</ScrollView>
	);
}
