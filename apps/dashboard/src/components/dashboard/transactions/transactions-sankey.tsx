"use client";

import { convertToUserCurrency } from "@/lib/utils/financial";
import type { Transaction } from "@guilders/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { Layer, Rectangle, Sankey } from "recharts";

interface TransactionsSankeyProps {
  transactions: Transaction[] | undefined;
  isLoading: boolean;
  userCurrency: string;
}

interface SankeyNode {
  name: string;
  value?: number;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
  color?: string;
  flowIndex: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

function toFiniteNumber(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function convertAmountSafely(
  amount: unknown,
  fromCurrency: string,
  userCurrency: string,
): number {
  const normalizedAmount = toFiniteNumber(amount);
  const convertedAmount = convertToUserCurrency(
    normalizedAmount,
    fromCurrency,
    [],
    userCurrency,
  );
  return Number.isFinite(convertedAmount) ? convertedAmount : 0;
}

// Define chart color config with theme support
const chartConfig: ChartConfig = {
  income: {
    theme: {
      light: "hsl(142.1 76.2% 36.3%)", // green-600
      dark: "hsl(142.1 70.6% 45.3%)", // green-500
    },
  },
  expense: {
    theme: {
      light: "hsl(0 84.2% 60.2%)", // red-500
      dark: "hsl(0 72.2% 50.6%)", // red-600
    },
  },
  flow1: {
    theme: {
      light: "hsl(221.2 83.2% 53.3%)", // blue-500
      dark: "hsl(217.2 91.2% 59.8%)", // blue-400
    },
  },
  flow2: {
    theme: {
      light: "hsl(24.6 95% 53.1%)", // orange-500
      dark: "hsl(20.5 90.2% 48.2%)", // orange-600
    },
  },
  flow3: {
    theme: {
      light: "hsl(262.1 83.3% 57.8%)", // purple-500
      dark: "hsl(263.4 70% 50.4%)", // purple-600
    },
  },
  flow4: {
    theme: {
      light: "hsl(316.6 73.3% 52.4%)", // pink-500
      dark: "hsl(322.1 73.7% 59.8%)", // pink-400
    },
  },
  flow5: {
    theme: {
      light: "hsl(189.5 94.5% 42.7%)", // cyan-500
      dark: "hsl(192.9 82.3% 49.8%)", // cyan-400
    },
  },
  flow6: {
    theme: {
      light: "hsl(168.6 76.2% 36.3%)", // teal-500
      dark: "hsl(168.6 70.6% 45.3%)", // teal-400
    },
  },
  flow7: {
    theme: {
      light: "hsl(43.3 96.4% 56.3%)", // yellow-500
      dark: "hsl(48 96.5% 53.3%)", // yellow-400
    },
  },
  flow8: {
    theme: {
      light: "hsl(280.6 83.3% 52.4%)", // violet-500
      dark: "hsl(280.6 73.7% 59.8%)", // violet-400
    },
  },
  flow9: {
    theme: {
      light: "hsl(144.9 80.4% 42.9%)", // emerald-500
      dark: "hsl(142.1 76.2% 47.3%)", // emerald-400
    },
  },
  flow10: {
    theme: {
      light: "hsl(334.9 85.2% 56.9%)", // rose-500
      dark: "hsl(336 80.2% 58.2%)", // rose-400
    },
  },
  flow11: {
    theme: {
      light: "hsl(199.7 88.7% 48.4%)", // sky-500
      dark: "hsl(198.6 88.7% 53.3%)", // sky-400
    },
  },
  flow12: {
    theme: {
      light: "hsl(291.5 93.5% 58.4%)", // fuchsia-500
      dark: "hsl(292.2 84.1% 60.6%)", // fuchsia-400
    },
  },
};

// Custom node component with theme support
function CustomNode({
  x,
  y,
  width,
  height,
  index,
  payload,
  userCurrency,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
}: any) {
  if (![x, y, width, height].every(Number.isFinite)) return null;

  const nodeName = String(payload?.name ?? "");
  const isIncome = nodeName.includes("Income");
  const nodeValue = toFiniteNumber(payload.value);
  const formattedValue = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: userCurrency,
    maximumFractionDigits: 0,
  }).format(Math.round(nodeValue));

  const categoryName = nodeName
    .replace(/ \(Income\)$/, "")
    .replace(/ \(Expense\)$/, "");

  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={`var(--color-${isIncome ? "income" : "expense"})`}
        fillOpacity={1}
      />
      <text
        textAnchor={isIncome ? "end" : "start"}
        x={isIncome ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize="12"
        className="fill-foreground"
      >
        {categoryName}
      </text>
      <text
        textAnchor={isIncome ? "end" : "start"}
        x={isIncome ? x - 6 : x + width + 6}
        y={y + height / 2 + 13}
        fontSize="10"
        className="fill-muted-foreground"
      >
        {formattedValue}
      </text>
    </Layer>
  );
}

// Custom link component with theme support
function CustomLink({
  sourceX,
  sourceY,
  sourceControlX,
  targetX,
  targetY,
  targetControlX,
  linkWidth,
  payload,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
}: any) {
  const flowIndex = payload.flowIndex;

  return (
    <path
      d={`
        M${sourceX},${sourceY}
        C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
      `}
      fill="none"
      stroke={`var(--color-flow${flowIndex})`}
      strokeWidth={linkWidth}
      strokeOpacity={0.6}
      onMouseEnter={(e) => {
        e.currentTarget.style.strokeOpacity = "0.8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.strokeOpacity = "0.6";
      }}
    />
  );
}

export function TransactionsSankey({
  transactions,
  isLoading,
  userCurrency,
}: TransactionsSankeyProps) {
  const sankeyData = useMemo<SankeyData>(() => {
    if (!transactions) return { nodes: [], links: [] };

    const normalizedTransactions = transactions.map((transaction) => {
      const amount = toFiniteNumber(transaction.amount);
      const category = transaction.category || "uncategorized";
      const convertedAmount = convertAmountSafely(
        amount,
        transaction.currency,
        userCurrency,
      );

      return {
        amount,
        category,
        convertedAmount,
      };
    });

    // Separate income and expense transactions
    const incomeCategories = new Set<string>();
    const expenseCategories = new Set<string>();

    for (const t of normalizedTransactions) {
      if (t.amount > 0) incomeCategories.add(t.category);
      if (t.amount < 0) expenseCategories.add(t.category);
    }

    // Convert sets to arrays for mapping
    const incomeArray = Array.from(incomeCategories);
    const expenseArray = Array.from(expenseCategories);

    // Calculate total values for each category
    const categoryTotals = new Map<string, number>();

    for (const t of normalizedTransactions) {
      if (t.amount === 0) continue;
      const amount = Math.abs(t.convertedAmount);
      const key = `${t.category} (${t.amount > 0 ? "Income" : "Expense"})`;
      categoryTotals.set(key, (categoryTotals.get(key) || 0) + amount);
    }

    // Create nodes array: income categories -> Income node -> expense categories
    const nodes: SankeyNode[] = [
      ...incomeArray.map(
        (cat): SankeyNode => ({
          name: `${cat} (Income)`,
          value: categoryTotals.get(`${cat} (Income)`) || 0,
        }),
      ),
      { name: "Income", value: 0 }, // Central income node
      ...expenseArray.map(
        (cat): SankeyNode => ({
          name: `${cat} (Expense)`,
          value: categoryTotals.get(`${cat} (Expense)`) || 0,
        }),
      ),
    ];

    // Create indices maps
    const incomeIndices = new Map(
      incomeArray.map((cat, index) => [cat, index]),
    );
    const incomeNodeIndex = incomeArray.length; // Index of the central "Income" node
    const expenseIndices = new Map(
      expenseArray.map((cat, index) => [cat, index + incomeArray.length + 1]),
    );

    const links: SankeyLink[] = [];
    let colorIndex = 0;

    // First set of links: from income categories to central Income node
    for (const incomeCat of incomeArray) {
      const incomeForCategory = normalizedTransactions
        .filter((t) => t.amount > 0 && t.category === incomeCat)
        .reduce((sum, t) => sum + t.convertedAmount, 0);

      if (incomeForCategory > 0) {
        links.push({
          source: incomeIndices.get(incomeCat) ?? 0,
          target: incomeNodeIndex,
          value: incomeForCategory,
          flowIndex: (colorIndex % 12) + 1, // Use all 12 colors
        });
        colorIndex++;
      }
    }

    // Reset color index for expenses to start from first color again
    colorIndex = 0;

    // Second set of links: from central Income node to expense categories
    for (const expenseCat of expenseArray) {
      const expenseForCategory = Math.abs(
        normalizedTransactions
          .filter((t) => t.amount < 0 && t.category === expenseCat)
          .reduce((sum, t) => sum + t.convertedAmount, 0),
      );

      if (expenseForCategory > 0) {
        links.push({
          source: incomeNodeIndex,
          target: expenseIndices.get(expenseCat) ?? 0,
          value: expenseForCategory,
          flowIndex: (colorIndex % 12) + 1, // Use all 12 colors
        });
        colorIndex++;
      }
    }

    return { nodes, links };
  }, [transactions, userCurrency]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!transactions?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer className="w-full h-[400px]" config={chartConfig}>
          <Sankey
            data={sankeyData}
            node={<CustomNode userCurrency={userCurrency} />}
            link={<CustomLink />}
            nodePadding={20}
            nodeWidth={10}
            margin={{ top: 10, right: 100, bottom: 10, left: 60 }}
          />
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
