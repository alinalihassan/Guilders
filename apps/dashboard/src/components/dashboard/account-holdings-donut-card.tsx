"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { useRates } from "@/lib/queries/useRates";
import { useUser } from "@/lib/queries/useUser";
import { convertToUserCurrency } from "@/lib/utils/financial";

type AccountWithValue = {
	id: number;
	name: string;
	subtype: string;
	value: string;
	currency: string;
};

const CHART_COLORS = [
	"#3e84f7",
	"#82d0fa",
	"#83d1ce",
	"#b263ea",
	"#5f5fde",
	"#FF9F45",
	"#eb4b63",
	"#22c55e",
	"#eab308",
	"#a855f7",
];

interface AccountHoldingsDonutCardProps {
	holdings: AccountWithValue[];
	className?: string;
}

export function AccountHoldingsDonutCard({
	holdings,
	className,
}: AccountHoldingsDonutCardProps) {
	const { data: rates } = useRates();
	const { data: user } = useUser();
	const userCurrency = user?.settings.currency ?? "EUR";

	const data = useMemo(() => {
		return holdings
			.map((child) => {
				const value = convertToUserCurrency(
					child.value,
					child.currency,
					rates,
					userCurrency,
				);
				return {
					name: child.name,
					value: Math.abs(Number(value)),
				};
			})
			.filter((d) => d.value > 0)
			.sort((a, b) => b.value - a.value)
			.map((item, index) => ({
				...item,
				color: CHART_COLORS[index % CHART_COLORS.length],
			}));
	}, [holdings, rates, userCurrency]);

	const chartConfig = useMemo(() => {
		const config: ChartConfig = {};
		for (const item of data) {
			config[item.name] = { label: item.name, color: item.color };
		}
		return config;
	}, [data]);

	if (data.length === 0) {
		return (
			<Card className={className}>
				<CardHeader className="flex flex-col p-6">
					<CardTitle className="text-lg font-normal">Spread</CardTitle>
				</CardHeader>
				<CardContent className="flex items-center justify-center py-12">
					<p className="text-sm text-muted-foreground">No holdings</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader className="flex flex-col p-6">
				<CardTitle className="text-lg font-normal">Spread</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={chartConfig}
					className="max-h-[216px] w-full"
				>
					<PieChart>
						<ChartTooltip
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value) =>
										`${Number(value).toLocaleString(undefined, {
											style: "currency",
											currency: userCurrency,
											minimumFractionDigits: 0,
											maximumFractionDigits: 0,
										})}`
									}
								/>
							}
						/>
						<Pie
							data={data}
							dataKey="value"
							nameKey="name"
							cx="50%"
							cy="50%"
							innerRadius={60}
							outerRadius={80}
							strokeWidth={0}
							paddingAngle={2}
						>
							{data.map((entry) => (
								<Cell
									key={entry.name}
									fill={entry.color}
									fillOpacity={0.9}
								/>
							))}
						</Pie>
					</PieChart>
				</ChartContainer>
				<div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
					{data.map((entry) => (
						<div key={entry.name} className="flex items-center gap-1.5 text-xs">
							<div
								className="h-2 w-2 shrink-0 rounded-sm"
								style={{ backgroundColor: entry.color }}
							/>
							<span className="text-muted-foreground">{entry.name}</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
