"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CornerDownRight, GripVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CategoryFlatItem } from "@/lib/utils/category-tree";

import { CategoryColorIconSelector } from "./-color-icon-selector";

type CategoryRowProps = {
  category: CategoryFlatItem;
  onUpdate: (
    id: number,
    payload: { name?: string; color?: string | null; icon?: string | null },
  ) => void;
  onRemove: (id: number) => void;
  isRemoving: boolean;
};

export function CategoryRow({ category, onUpdate, onRemove, isRemoving }: CategoryRowProps) {
  const depth = category.depth ?? 0;
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(category.name);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
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

  useEffect(() => {
    if (isEditingName) inputRef.current?.focus();
  }, [isEditingName]);

  const saveName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== category.name) {
      onUpdate(category.id, { name: trimmed });
    } else {
      setNameDraft(category.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveName();
    }
    if (e.key === "Escape") {
      setNameDraft(category.name);
      setIsEditingName(false);
      inputRef.current?.blur();
    }
  };

  const hasParent = category.parent_id != null;

  return (
    <div style={{ marginLeft: depth * 20 }} className="flex items-center gap-2">
      {hasParent && (
        <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <div
        ref={setRef}
        style={style}
        className={cn(
          "flex flex-1 items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
          isDragging && "opacity-50 shadow-md",
          isOver && "border-primary/50 bg-primary/5",
          !isDragging && !isOver && "border-border/60 bg-card hover:bg-muted/30",
        )}
      >
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <CategoryColorIconSelector
          value={category.color ?? "#64748b"}
          icon={category.icon ?? null}
          onColorSelect={(color) => onUpdate(category.id, { color })}
          onIconSelect={(icon) => onUpdate(category.id, { icon })}
          size="lg"
          className="shrink-0"
        />
        {isEditingName ? (
          <Input
            ref={inputRef}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={handleNameKeyDown}
            className="ml-[-3px] h-7 min-w-[8rem] max-w-[14rem] shrink-0 pl-0.5 text-sm font-medium"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setNameDraft(category.name);
              setIsEditingName(true);
            }}
            className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground hover:underline"
          >
            {category.name}
          </button>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isRemoving}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete category</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete “{category.name}”? This cannot be undone. Transactions using this category
                  may need to be recategorized.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onRemove(category.id)}
                  disabled={isRemoving}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isRemoving ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
