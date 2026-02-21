import { icons } from "lucide-react";

export const Icon = ({
  name,
  color,
  size,
  className,
}: {
  name: keyof typeof icons;
  color?: string;
  size: number;
  className?: string;
}) => {
  const LucideIcon = icons[name as keyof typeof icons] as any;

  if (!LucideIcon) return null;

  return <LucideIcon color={color} size={size} className={className} />;
};
