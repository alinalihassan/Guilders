"use client";

import { Dialogs } from "@/components/dialogs/dialogs";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { AppTopBar } from "@/components/nav/app-top-bar";
import type { ReactNode } from "react";

const ProtectedLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 flex flex-col md:ml-16 min-h-screen">
        <AppTopBar />
        <main className="flex-1 flex flex-col px-8 bg-muted/40">
          {children}
        </main>
      </div>
      <Dialogs />
    </div>
  );
};

export default ProtectedLayout;
