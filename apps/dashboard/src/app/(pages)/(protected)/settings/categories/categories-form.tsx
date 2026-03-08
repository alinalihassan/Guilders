import type { CategoryInsert } from "@guilders/api/types";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddCategory,
  useCategories,
  useRemoveCategory,
  useUpdateCategory,
} from "@/lib/queries/useCategories";
import {
  buildCategoryLookup,
  flattenCategoryTree,
  getCategoryAndDescendantIds,
  type CategoryFlatItem,
} from "@/lib/utils/category-tree";
import { CategoryRow } from "./-category-row";
import { CategoryColorSelector } from "./-color-selector";
import type { EditState } from "./-constants";
import { RootDropZone } from "./-root-drop-zone";

export function CategoriesForm() {
  const { data: categoriesTree, isLoading } = useCategories();
  const { mutate: addCategory, isPending: isAdding } = useAddCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: removeCategory, isPending: isRemoving } = useRemoveCategory();

  const flatList = useMemo(
    () => flattenCategoryTree(categoriesTree ?? [], { withDepth: true }),
    [categoriesTree],
  );
  const categoryLookup = useMemo(
    () => buildCategoryLookup(categoriesTree ?? []),
    [categoriesTree],
  );

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#64748b");
  const [newClassification, setNewClassification] = useState<"income" | "expense">("expense");
  const [editing, setEditing] = useState<EditState | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleAdd = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const payload: Partial<CategoryInsert> = {
      name: trimmed,
      parent_id: null,
      color: newColor,
      icon: null,
      classification: newClassification,
    };
    addCategory(payload, {
      onSuccess: () => {
        setNewName("");
        setNewColor("#64748b");
        setNewClassification("expense");
      },
    });
  }, [newName, newColor, newClassification, addCategory]);

  const startEditing = useCallback((c: CategoryFlatItem) => {
    setEditing({
      id: c.id,
      name: c.name,
      parent_id: c.parent_id ?? null,
      color: c.color ?? "#64748b",
      icon: c.icon ?? null,
      classification: (c.classification as "income" | "expense") ?? "expense",
    });
  }, []);

  const cancelEditing = useCallback(() => setEditing(null), []);

  const saveEditing = useCallback(() => {
    if (!editing || !editing.name.trim()) return;
    updateCategory(
      {
        id: editing.id,
        category: {
          name: editing.name.trim(),
          parent_id: editing.parent_id,
          color: editing.color ?? "#64748b",
          icon: editing.icon || null,
          classification: editing.classification,
        },
      },
      { onSuccess: cancelEditing },
    );
  }, [editing, updateCategory, cancelEditing]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const draggedId = active.id as number;
      const category = categoryLookup.get(draggedId);
      if (!category) return;

      const excludeSelfAndDescendants = getCategoryAndDescendantIds(
        categoriesTree ?? [],
        draggedId,
      );

      let newParentId: number | null = null;
      if (over.id === "root") {
        newParentId = null;
      } else if (typeof over.id === "number" && !excludeSelfAndDescendants.has(over.id)) {
        newParentId = over.id as number;
      } else {
        return;
      }

      if (category.parent_id === newParentId) return;

      updateCategory({
        id: draggedId,
        category: {
          name: category.name,
          parent_id: newParentId,
          color: category.color ?? undefined,
          icon: category.icon ?? undefined,
          classification: (category.classification as "income" | "expense") ?? "expense",
        },
      });
    },
    [categoryLookup, categoriesTree, updateCategory],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Categories</CardTitle>
        <CardDescription>
          Add categories below, then drag to change parent. Drop on a category to nest under it, or
          on the root zone to make top-level.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
          <CategoryColorSelector
            value={newColor}
            onColorSelect={setNewColor}
            size="default"
            className="shrink-0"
          />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Groceries"
            className="w-44"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Select
            value={newClassification}
            onValueChange={(v) => setNewClassification(v as "income" | "expense")}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={isAdding || !newName.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>

        {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3"
                >
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
        ) : flatList.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No categories yet. Add your first one above.
          </p>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <RootDropZone />
            <div className="space-y-1 pt-1">
              {flatList.map((category) => {
                const parentName =
                  category.parent_id != null
                    ? categoryLookup.get(category.parent_id)?.name
                    : null;
                return (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    parentName={parentName}
                    isEditing={editing?.id === category.id}
                    editState={editing}
                    onStartEdit={startEditing}
                    onCancelEdit={cancelEditing}
                    onSaveEdit={saveEditing}
                    setEditState={setEditing}
                    onRemove={removeCategory}
                    isRemoving={isRemoving}
                    isUpdating={isUpdating}
                  />
                );
              })}
            </div>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
