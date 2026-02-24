"use client";

import { defineRegistry } from "@json-render/react";

import { StockCard, type StockCardProps } from "@/components/generative-ui/stock-card";

import { advisorCatalog } from "./catalog";

export const { registry } = defineRegistry(advisorCatalog, {
  components: {
    StockCard: ({ props }: { props: StockCardProps }) => <StockCard {...props} />,
  },
} as never);
