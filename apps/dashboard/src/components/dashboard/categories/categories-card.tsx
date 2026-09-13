import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { NetWorthCategories } from "./categories";

export function CategoriesCard({ className }: { className?: string }) {
  return (
    <Card className={cn("shadow-none", className)}>
      <CardContent className="flex h-full flex-col gap-5 p-6">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
          Allocation
        </p>
        <NetWorthCategories />
      </CardContent>
    </Card>
  );
}
