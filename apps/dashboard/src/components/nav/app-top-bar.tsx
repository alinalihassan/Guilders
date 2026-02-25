"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

import { SearchBar } from "../nav/search-bar";
import { UserButton } from "../nav/user-button";
import { DynamicBreadcrumbs } from "./dynamic-breadcrumbs";

export function AppTopBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const toggleMenu = useStore((state) => state.toggleMenu);

  useEffect(() => {
    setIsScrolled(window.scrollY > 0);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky z-20 top-0 flex h-16 shrink-0 items-center gap-2 transition-all duration-200",
        "px-4 md:px-8",
        isScrolled
          ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 shadow-sm"
          : "bg-muted/40",
      )}
    >
      <div className="flex flex-1 items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" onClick={toggleMenu}>
          <Menu className="h-5 w-5" />
        </Button>
        <DynamicBreadcrumbs />
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <SearchBar />
        <UserButton />
      </div>
    </header>
  );
}
