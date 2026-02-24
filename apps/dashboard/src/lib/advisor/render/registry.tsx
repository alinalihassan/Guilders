"use client";

import { defineRegistry } from "@json-render/react";
import { advisorCatalog } from "./catalog";
import { StockCard, type StockCardProps } from "@/components/generative-ui/stock-card";

export const { registry } = defineRegistry(advisorCatalog, {
  components: {
    StockCard: ({ props }: { props: StockCardProps }) => <StockCard {...props} />,
  },
} as never);
