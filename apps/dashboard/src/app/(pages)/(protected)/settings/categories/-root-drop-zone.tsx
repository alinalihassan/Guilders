import { useDroppable } from "@dnd-kit/core";

export function RootDropZone() {
  const { isOver, setNodeRef } = useDroppable({ id: "root" });

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-lg border-2 border-dashed px-3 py-2 text-center text-sm transition-colors
        ${isOver ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25 bg-muted/20"}
      `}
    >
      <span className="text-muted-foreground">
        {isOver ? "Drop to make root" : "Drop here for root level"}
      </span>
    </div>
  );
}
