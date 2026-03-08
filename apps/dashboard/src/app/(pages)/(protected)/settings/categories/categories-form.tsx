import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { CategoryInsert } from "@guilders/api/types";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CategoryColorIconSelector } from "./-color-icon-selector";
import { DEFAULT_CATEGORY_ICON, PRESET_COLORS } from "./-constants";
import { RootDropZone } from "./-root-drop-zone";

type SectionConfig = {
  classification: "income" | "expense";
  list: CategoryFlatItem[];
  title: string;
  addName: string;
  setAddName: (v: string) => void;
  addColor: string;
  setAddColor: (v: string) => void;
  addIcon: string;
  setAddIcon: (v: string) => void;
  onAdd: () => void;
  rootId: string;
  rootLabel: string;
};

export function CategoriesForm() {
  const { categoryTree, data: flatCategories, isLoading } = useCategories();
  const { mutate: addCategory, isPending: isAdding } = useAddCategory();
  const { mutate: updateCategory } = useUpdateCategory();
  const { mutate: removeCategory, isPending: isRemoving } = useRemoveCategory();

  const flatList = flattenCategoryTree(categoryTree ?? [], { withDepth: true });
  const categoryLookup = buildCategoryLookup(flatCategories ?? []);

  const incomeList = flatList.filter((c) => c.classification === "income");
  const expenseList = flatList.filter((c) => c.classification === "expense");

  const [newIncomeName, setNewIncomeName] = useState("");
  const [newIncomeColor, setNewIncomeColor] = useState<string>(PRESET_COLORS[4]); // green
  const [newIncomeIcon, setNewIncomeIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseColor, setNewExpenseColor] = useState<string>(PRESET_COLORS[0]); // slate
  const [newExpenseIcon, setNewExpenseIcon] = useState(DEFAULT_CATEGORY_ICON);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleAddIncome = () => {
    const trimmed = newIncomeName.trim();
    if (!trimmed) return;
    const payload: Partial<CategoryInsert> = {
      name: trimmed,
      parent_id: null,
      color: newIncomeColor,
      icon: newIncomeIcon,
      classification: "income",
    };
    addCategory(payload, {
      onSuccess: () => {
        setNewIncomeName("");
        setNewIncomeColor(PRESET_COLORS[4]);
        setNewIncomeIcon(DEFAULT_CATEGORY_ICON);
      },
    });
  };

  const handleAddExpense = () => {
    const trimmed = newExpenseName.trim();
    if (!trimmed) return;
    const payload: Partial<CategoryInsert> = {
      name: trimmed,
      parent_id: null,
      color: newExpenseColor,
      icon: newExpenseIcon,
      classification: "expense",
    };
    addCategory(payload, {
      onSuccess: () => {
        setNewExpenseName("");
        setNewExpenseColor(PRESET_COLORS[0]);
        setNewExpenseIcon(DEFAULT_CATEGORY_ICON);
      },
    });
  };

  const handleUpdate = (
    id: number,
    payload: {
      name?: string;
      color?: string | null;
      icon?: string | null;
    },
  ) => {
    const category = categoryLookup.get(id);
    if (!category) return;
    updateCategory({
      id,
      category: {
        name: payload.name ?? category.name,
        parent_id: category.parent_id ?? undefined,
        color:
          payload.color !== undefined
            ? (payload.color ?? undefined)
            : (category.color ?? undefined),
        icon:
          payload.icon !== undefined ? (payload.icon ?? undefined) : (category.icon ?? undefined),
        classification: (category.classification as "income" | "expense") ?? "expense",
      },
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const draggedId = active.id as number;
    const category = categoryLookup.get(draggedId);
    if (!category) return;

    const excludeSelfAndDescendants = getCategoryAndDescendantIds(categoryTree ?? [], draggedId);

    let newParentId: number | null = null;
    let newClassification: "income" | "expense" = category.classification as "income" | "expense";

    if (over.id === "root-income") {
      newParentId = null;
      newClassification = "income";
    } else if (over.id === "root-expense") {
      newParentId = null;
      newClassification = "expense";
    } else if (typeof over.id === "number" && !excludeSelfAndDescendants.has(over.id)) {
      const target = categoryLookup.get(over.id as number);
      if (target) {
        newParentId = over.id as number;
        newClassification = target.classification as "income" | "expense";
      } else {
        return;
      }
    } else {
      return;
    }

    if (category.parent_id === newParentId && category.classification === newClassification) return;

    updateCategory({
      id: draggedId,
      category: {
        name: category.name,
        parent_id: newParentId,
        color: category.color ?? undefined,
        icon: category.icon ?? undefined,
        classification: newClassification,
      },
    });
  };

  const renderSection = (config: SectionConfig) => (
    <div className="space-y-2">
      <h3 className="text-md font-semibold text-foreground">{config.title}</h3>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
        <CategoryColorIconSelector
          value={config.addColor}
          icon={config.addIcon}
          onColorSelect={config.setAddColor}
          onIconSelect={config.setAddIcon}
          size="lg"
          className="shrink-0"
        />
        <Input
          value={config.addName}
          onChange={(e) => config.setAddName(e.target.value)}
          placeholder="e.g. Salary"
          className="w-44"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              config.onAdd();
            }
          }}
        />
        <Button onClick={config.onAdd} disabled={isAdding || !config.addName.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
      <RootDropZone
        id={config.rootId}
        label={config.rootLabel}
        dropHint={`Drop to make top-level ${config.classification}`}
      />
      <div className="space-y-1 pt-1">
        {config.list.map((category) => {
          return (
            <CategoryRow
              key={category.id}
              category={category}
              onUpdate={handleUpdate}
              onRemove={removeCategory}
              isRemoving={isRemoving}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-3 rounded-lg border border-border/60 px-3 py-2.5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-44" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-border/60 px-4 py-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-border/60 px-4 py-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {renderSection({
            classification: "income",
            list: incomeList,
            title: "Income categories",
            addName: newIncomeName,
            setAddName: setNewIncomeName,
            addColor: newIncomeColor,
            setAddColor: setNewIncomeColor,
            addIcon: newIncomeIcon,
            setAddIcon: setNewIncomeIcon,
            onAdd: handleAddIncome,
            rootId: "root-income",
            rootLabel: "Drop here for top-level income",
          })}
          {renderSection({
            classification: "expense",
            list: expenseList,
            title: "Expense categories",
            addName: newExpenseName,
            setAddName: setNewExpenseName,
            addColor: newExpenseColor,
            setAddColor: setNewExpenseColor,
            addIcon: newExpenseIcon,
            setAddIcon: setNewExpenseIcon,
            onAdd: handleAddExpense,
            rootId: "root-expense",
            rootLabel: "Drop here for top-level expense",
          })}
        </DndContext>
      )}
    </div>
  );
}
