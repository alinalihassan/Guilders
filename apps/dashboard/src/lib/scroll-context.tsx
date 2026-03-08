"use client";

import { createContext, useContext } from "react";

interface MainScrollContextValue {
  isScrolled: boolean;
}

const MainScrollContext = createContext<MainScrollContextValue>({
  isScrolled: false,
});

export function MainScrollProvider({
  isScrolled,
  children,
}: MainScrollContextValue & { children: React.ReactNode }) {
  return <MainScrollContext.Provider value={{ isScrolled }}>{children}</MainScrollContext.Provider>;
}

export function useMainScroll() {
  return useContext(MainScrollContext);
}
