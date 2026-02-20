import { router } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import {
	ActivityIndicator,
	Animated,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	Pressable,
	RefreshControl,
	SectionList,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import {
	type Transaction,
	useAssets,
	useTransactions,
} from "@/hooks/use-dashboard";

type ColorSet = (typeof Colors)["light"] | (typeof Colors)["dark"];

// ─── Constants ───────────────────────────────────────────────────────────────

// How far the user must scroll before the header collapses
const COLLAPSE_THRESHOLD = 80;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(
	value: number,
	currency = "USD",
): { whole: string; decimal: string } {
	const formatted = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Math.abs(value));
	const parts = formatted.split(".");
	return {
		whole: (value < 0 ? "-" : "") + (parts[0] ?? ""),
		decimal: parts[1] ?? "00",
	};
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

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
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

// ─── Components ──────────────────────────────────────────────────────────────

function NetWorthHero({
	totalValue,
	loading,
	colors,
	insetTop,
	collapsed,
}: {
	totalValue: number;
	loading: boolean;
	colors: ColorSet;
	insetTop: number;
	collapsed: Animated.Value;
}) {
	const isNegative = totalValue < 0;
	const { whole, decimal } = formatCurrency(totalValue);

	// Interpolations driven by `collapsed` (0 = expanded, 1 = collapsed)
	const bigFontSize = collapsed.interpolate({
		inputRange: [0, 1],
		outputRange: [64, 28],
		extrapolate: "clamp",
	});
	const bigLineHeight = collapsed.interpolate({
		inputRange: [0, 1],
		outputRange: [72, 34],
		extrapolate: "clamp",
	});
	const bigLetterSpacing = collapsed.interpolate({
		inputRange: [0, 1],
		outputRange: [-2, -0.5],
		extrapolate: "clamp",
	});

	const decimalFontSize = collapsed.interpolate({
		inputRange: [0, 1],
		outputRange: [28, 18],
		extrapolate: "clamp",
	});
	const decimalPaddingBottom = collapsed.interpolate({
		inputRange: [0, 1],
		outputRange: [8, 3],
		extrapolate: "clamp",
	});

	const labelOpacity = collapsed.interpolate({
		inputRange: [0, 0.5],
		outputRange: [1, 0],
		extrapolate: "clamp",
	});
	const labelHeight = collapsed.interpolate({
		inputRange: [0, 0.5],
		outputRange: [20, 0],
		extrapolate: "clamp",
	});

	const containerPaddingBottom = collapsed.interpolate({
		inputRange: [0, 1],
		outputRange: [Spacing.four, Spacing.two],
		extrapolate: "clamp",
	});
	const containerPaddingTop = collapsed.interpolate({
		inputRange: [0, 1],
		outputRange: [insetTop + Spacing.two, insetTop + Spacing.one],
		extrapolate: "clamp",
	});

	return (
		<Animated.View
			style={{
				paddingTop: containerPaddingTop,
				paddingBottom: containerPaddingBottom,
				paddingHorizontal: Spacing.four,
				backgroundColor: colors.background,
				gap: Spacing.one,
			}}
		>
			{/* "Net Worth" label — fades out */}
			<Animated.View
				style={{
					height: labelHeight,
					opacity: labelOpacity,
					overflow: "hidden",
					justifyContent: "center",
				}}
			>
				<Text
					style={{
						fontSize: 13,
						fontWeight: "500",
						color: colors.textSecondary,
						letterSpacing: 0.5,
						textTransform: "uppercase",
					}}
				>
					Net Worth
				</Text>
			</Animated.View>

			{/* Big number — shrinks in place */}
			{loading ? (
				<View style={{ height: 72, justifyContent: "center" }}>
					<ActivityIndicator size="large" color={colors.textSecondary} />
				</View>
			) : (
				<View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
					<Animated.Text
						style={{
							fontSize: bigFontSize,
							fontWeight: "700",
							color: isNegative ? "#EF4444" : colors.text,
							fontFamily: Fonts?.rounded,
							lineHeight: bigLineHeight,
							fontVariant: ["tabular-nums"],
							letterSpacing: bigLetterSpacing,
						}}
					>
						{whole}
					</Animated.Text>
					<Animated.Text
						style={{
							fontSize: decimalFontSize,
							fontWeight: "600",
							color: isNegative ? "#EF4444" : colors.textSecondary,
							fontFamily: Fonts?.rounded,
							paddingBottom: decimalPaddingBottom,
							fontVariant: ["tabular-nums"],
						}}
					>
						.{decimal}
					</Animated.Text>
				</View>
			)}
		</Animated.View>
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
		<Pressable
			onPress={() => router.push(`/transaction/${item.id}`)}
			style={({ pressed }) => ({
				flexDirection: "row",
				alignItems: "center",
				paddingVertical: Spacing.two + 2,
				paddingHorizontal: Spacing.four,
				gap: Spacing.three,
				borderBottomWidth: isLast ? 0 : 0.5,
				borderBottomColor: colors.backgroundElement,
				opacity: pressed ? 0.7 : 1,
			})}
		>
			<View
				style={{
					width: 44,
					height: 44,
					borderRadius: 14,
					borderCurve: "continuous",
					backgroundColor: colors.backgroundElement,
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<Text style={{ fontSize: 20 }}>{getCategoryIcon(item.category)}</Text>
			</View>
			<View style={{ flex: 1, gap: 2 }}>
				<Text
					numberOfLines={1}
					style={{ fontSize: 15, fontWeight: "600", color: colors.text }}
				>
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
				}}
			>
				{formattedAmount}
			</Text>
		</Pressable>
	);
}

function EmptyTransactions({ colors }: { colors: ColorSet }) {
	return (
		<View
			style={{
				alignItems: "center",
				paddingVertical: Spacing.six,
				gap: Spacing.two,
			}}
		>
			<Text style={{ fontSize: 32 }}>📭</Text>
			<Text style={{ fontSize: 15, color: colors.textSecondary }}>
				No transactions yet
			</Text>
		</View>
	);
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HomeScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
	const insets = useSafeAreaInsets();

	const {
		data: assetsData,
		loading: assetsLoading,
		refetch: refetchAssets,
	} = useAssets();
	const {
		data: transactions,
		loading: txLoading,
		refetch: refetchTx,
	} = useTransactions();

	// Animated value: 0 = expanded, 1 = collapsed
	const collapsed = useRef(new Animated.Value(0)).current;
	// Track the current scroll Y to know when we're truly at the top
	const scrollY = useRef(0);
	const isCollapsed = useRef(false);

	const handleScroll = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			const y = e.nativeEvent.contentOffset.y;
			scrollY.current = y;

			if (!isCollapsed.current && y > COLLAPSE_THRESHOLD) {
				// Scroll down past threshold → collapse
				isCollapsed.current = true;
				Animated.spring(collapsed, {
					toValue: 1,
					useNativeDriver: false,
					tension: 120,
					friction: 14,
				}).start();
			} else if (isCollapsed.current && y <= 0) {
				// Only expand when back at the very top
				isCollapsed.current = false;
				Animated.spring(collapsed, {
					toValue: 0,
					useNativeDriver: false,
					tension: 120,
					friction: 14,
				}).start();
			}
		},
		[collapsed],
	);

	const totalValue = useMemo(
		() => parseFloat(assetsData?.totalValue ?? "0"),
		[assetsData],
	);

	const transactionSections = useMemo(() => {
		const grouped: Record<string, Transaction[]> = {};
		for (const tx of transactions) {
			const key = formatDate(tx.date);
			if (!grouped[key]) grouped[key] = [];
			grouped[key].push(tx);
		}
		return Object.entries(grouped).map(([title, data]) => ({ title, data }));
	}, [transactions]);

	const onRefresh = useCallback(async () => {
		await Promise.all([refetchAssets(), refetchTx()]);
	}, [refetchAssets, refetchTx]);

	const isLoading = assetsLoading && txLoading;

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<NetWorthHero
				totalValue={totalValue}
				loading={assetsLoading}
				colors={colors}
				insetTop={insets.top}
				collapsed={collapsed}
			/>
			<View
				style={{ height: 0.5, backgroundColor: colors.backgroundElement }}
			/>
			<SectionList
				style={{ flex: 1 }}
				contentInsetAdjustmentBehavior="never"
				stickySectionHeadersEnabled={false}
				onScroll={handleScroll}
				scrollEventThrottle={16}
				refreshControl={
					<RefreshControl
						refreshing={isLoading}
						onRefresh={onRefresh}
						tintColor={colors.textSecondary}
					/>
				}
				sections={transactionSections}
				keyExtractor={(item) => String(item.id)}
				renderSectionHeader={({ section }) => (
					<View
						style={{
							paddingHorizontal: Spacing.four,
							paddingTop: Spacing.four,
							paddingBottom: Spacing.one,
							backgroundColor: colors.background,
						}}
					>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: colors.textSecondary,
								textTransform: "uppercase",
								letterSpacing: 0.5,
							}}
						>
							{section.title}
						</Text>
					</View>
				)}
				renderItem={({ item, index, section }) => (
					<TransactionRow
						item={item}
						colors={colors}
						isLast={index === section.data.length - 1}
					/>
				)}
				SectionSeparatorComponent={() => (
					<View style={{ height: Spacing.two }} />
				)}
				ListEmptyComponent={
					txLoading ? null : <EmptyTransactions colors={colors} />
				}
				ListFooterComponent={
					<View style={{ height: insets.bottom + Spacing.six }} />
				}
				contentContainerStyle={{ flexGrow: 1 }}
			/>
		</View>
	);
}
