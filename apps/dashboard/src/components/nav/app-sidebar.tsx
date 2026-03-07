"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";

import { MainMenu } from "./mainmenu";

export function AppSidebar() {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex h-8 items-center justify-center">
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
      </SidebarHeader>
      <SidebarContent>
        <MainMenu />
      </SidebarContent>
    </Sidebar>
  );
}
