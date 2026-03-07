import { Menu, PanelRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

import { SearchBar } from "../nav/search-bar";
import { DynamicBreadcrumbs } from "./dynamic-breadcrumbs";

interface AppTopBarProps {
  /** When provided, reflects scroll state of the layout's main container (main is scrollable, not window). */
  scrolled?: boolean;
}

export function AppTopBar({ scrolled = false }: AppTopBarProps) {
  const { toggleSidebar } = useSidebar();
  const advisorOpen = useStore((state) => state.advisorOpen);
  const openAdvisorSidebar = useStore((state) => state.openAdvisorSidebar);
  const closeAdvisorSidebar = useStore((state) => state.closeAdvisorSidebar);
  const toggleAdvisor = () => (advisorOpen ? closeAdvisorSidebar() : openAdvisorSidebar());

  const isScrolled = scrolled;

  return (
    <header
      className={cn(
        "sticky z-20 top-0 flex h-16 shrink-0 items-center gap-2 rounded-t-xl transition-all duration-200",
        "px-4 md:px-6",
        isScrolled
          ? "bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-sm"
          : "bg-card",
      )}
    >
      <div className="flex flex-1 items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <DynamicBreadcrumbs />
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <SearchBar />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={toggleAdvisor}
          aria-label={advisorOpen ? "Close AI advisor" : "Open AI advisor"}
          aria-pressed={advisorOpen}
        >
          <PanelRight className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
