"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useStore } from "@/lib/store";

export default function AdvisorRedirectPage() {
  const router = useRouter();
  const openAdvisorSidebar = useStore((state) => state.openAdvisorSidebar);

  useEffect(() => {
    openAdvisorSidebar();
    router.replace("/");
  }, [openAdvisorSidebar, router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}
