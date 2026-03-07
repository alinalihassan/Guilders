
import { Link } from "@tanstack/react-router";

import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";

import { MainMenu } from "./mainmenu";

export function AppSidebar() {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex h-8 items-center justify-center">
          <Link to="/" className="flex items-center">
            <img src="/assets/logo/logo.svg" alt="Guilders Logo" height={32} width={32} />
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <MainMenu />
      </SidebarContent>
    </Sidebar>
  );
}
