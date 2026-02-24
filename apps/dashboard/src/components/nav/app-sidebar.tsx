"use client";

import Image from "next/image";
import Link from "next/link";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

import { MainMenu } from "./mainmenu";

export function AppSidebar() {
  const isOpen = useStore((state) => state.isOpen);
  const closeMenu = useStore((state) => state.closeMenu);

  return (
    <>
      {/* Backdrop - only on mobile when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "h-screen w-16 flex-shrink-0 flex flex-col fixed top-0 left-0 z-50",
          // Different background based on screen size
          "bg-background border-r border-border",
          // Only apply transform on mobile
          "md:transform-none",
          "transition-transform duration-200",
          !isOpen && "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="h-8 flex items-center justify-center mt-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/assets/logo/logo.svg"
              alt="Guilders Logo"
              height={32}
              width={32}
              priority
            />
          </Link>
        </div>

        <MainMenu />
      </aside>
    </>
  );
}
