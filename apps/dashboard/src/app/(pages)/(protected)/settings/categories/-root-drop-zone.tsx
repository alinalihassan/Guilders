import { useDroppable } from "@dnd-kit/core";

type RootDropZoneProps = {
  id: string;
  label: string;
  dropHint?: string;
};

export function RootDropZone({ id, label, dropHint }: RootDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-lg border-2 border-dashed px-3 py-2 text-center text-sm transition-colors
        ${isOver ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25 bg-muted/20"}
      `}
    >
      <span className="text-muted-foreground">
        {isOver ? dropHint ?? `Drop to add to ${label}` : label}
      </span>
    </div>
  );
}
