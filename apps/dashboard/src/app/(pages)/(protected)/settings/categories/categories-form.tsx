"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAddCategory, useCategories, useRemoveCategory, useUpdateCategory } from "@/lib/queries/useCategories";

export function CategoriesForm() {
  const { data: categories, isLoading } = useCategories();
  const { mutate: addCategory, isPending: isAdding } = useAddCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: removeCategory, isPending: isRemoving } = useRemoveCategory();

  const [newCategory, setNewCategory] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState("");

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    addCategory(
      { name: trimmed },
      {
        onSuccess: () => {
          setNewCategory("");
        },
      },
    );
  };

  const startEditing = (id: number, currentName: string) => {
    setEditingCategoryId(id);
    setEditedCategoryName(currentName);
  };

  const cancelEditing = () => {
    setEditingCategoryId(null);
    setEditedCategoryName("");
  };

  const saveCategory = (id: number) => {
    const trimmed = editedCategoryName.trim();
    if (!trimmed) return;
    updateCategory(
      { id, category: { name: trimmed } },
      {
        onSuccess: () => {
          cancelEditing();
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Add and maintain categories used by transaction dialogs and filters.
        </p>
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="e.g. Groceries"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddCategory();
              }
            }}
          />
          <Button onClick={handleAddCategory} disabled={isAdding || !newCategory.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading categories...</p>
      ) : !categories || categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet. Add your first one above.</p>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => {
            const isEditing = editingCategoryId === category.id;
            return (
              <div
                key={category.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                {isEditing ? (
                  <Input
                    value={editedCategoryName}
                    onChange={(event) => setEditedCategoryName(event.target.value)}
                    className="h-8"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveCategory(category.id);
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelEditing();
                      }
                    }}
                  />
                ) : (
                  <span className="text-sm">{category.name}</span>
                )}

                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => saveCategory(category.id)}
                        disabled={isUpdating || !editedCategoryName.trim()}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={cancelEditing}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(category.id, category.name)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCategory(category.id)}
                        disabled={isRemoving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
