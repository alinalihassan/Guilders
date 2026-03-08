import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryFlatItem } from "@/lib/utils/category-tree";
import { cn } from "@/lib/utils";

import { CategoryColorSelector } from "./-color-selector";
import type { EditState } from "./-constants";

type CategoryRowProps = {
  category: CategoryFlatItem;
  parentName: string | null;
  isEditing: boolean;
  editState: EditState | null;
  onStartEdit: (c: CategoryFlatItem) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  setEditState: (s: EditState | null) => void;
  onRemove: (id: number) => void;
  isRemoving: boolean;
  isUpdating: boolean;
};

export function CategoryRow({
  category,
  parentName,
  isEditing,
  editState,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  setEditState,
  onRemove,
  isRemoving,
  isUpdating,
}: CategoryRowProps) {
  const depth = category.depth ?? 0;

  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: category.id,
  });

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: category.id,
  });

  const setRef = (node: HTMLDivElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  if (isEditing && editState) {
    return (
      <div
        ref={setRef}
        className="flex items-center gap-2 rounded-lg border border-primary/30 bg-muted/30 px-3 py-2.5 shadow-sm"
        style={{ marginLeft: depth * 20 }}
      >
        <button
          type="button"
          className="cursor-grab touch-none shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Drag"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <CategoryColorSelector
          value={editState.color ?? "#64748b"}
          onColorSelect={(color) => setEditState({ ...editState, color })}
          size="default"
          className="shrink-0"
        />
        <Input
          value={editState.name}
          onChange={(e) => setEditState({ ...editState, name: e.target.value })}
          className="h-8 w-40 shrink-0"
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEdit();
            if (e.key === "Escape") onCancelEdit();
          }}
        />
        <Select
          value={editState.classification}
          onValueChange={(v) =>
            setEditState({ ...editState, classification: v as "income" | "expense" })
          }
        >
          <SelectTrigger className="h-8 w-28 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onSaveEdit}
            disabled={isUpdating || !editState.name.trim()}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setRef}
      style={{ ...style, marginLeft: depth * 20 }}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        isDragging && "opacity-50 shadow-md",
        isOver && "border-primary/50 bg-primary/5",
        !isDragging && !isOver && "border-border/60 bg-card hover:bg-muted/30",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background p-0.5"
        aria-hidden
      >
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: category.color ?? "#64748b" }}
        />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{category.name}</span>
      {parentName && (
        <span className="truncate text-xs text-muted-foreground">under {parentName}</span>
      )}
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium",
          category.classification === "income"
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        {category.classification === "income" ? "Income" : "Expense"}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => onStartEdit(category)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(category.id)}
          disabled={isRemoving}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
