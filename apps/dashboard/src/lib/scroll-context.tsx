"use client";

import { createContext, useContext, useMemo } from "react";

interface MainScrollContextValue {
  isScrolled: boolean;
  scrollElement: HTMLElement | null;
}

const MainScrollContext = createContext<MainScrollContextValue>({
  isScrolled: false,
  scrollElement: null,
});

export function MainScrollProvider({
  isScrolled,
  scrollElement = null,
  children,
}: {
  isScrolled: boolean;
  scrollElement?: HTMLElement | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ isScrolled, scrollElement }), [isScrolled, scrollElement]);
  return <MainScrollContext.Provider value={value}>{children}</MainScrollContext.Provider>;
}

export function useMainScroll() {
  return useContext(MainScrollContext);
}
