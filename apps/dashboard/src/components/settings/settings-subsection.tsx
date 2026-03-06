import { cn } from "@/lib/utils";

interface SettingsSubsectionProps {
  title: string;
  description?: string;
  variant?: "default" | "danger";
  children: React.ReactNode;
}

export function SettingsSubsection({
  title,
  description,
  variant = "default",
  children,
}: SettingsSubsectionProps) {
  return (
    <div className="space-y-4">
      <h2 className={cn("text-lg font-semibold", variant === "danger" && "text-destructive")}>
        {title}
      </h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
