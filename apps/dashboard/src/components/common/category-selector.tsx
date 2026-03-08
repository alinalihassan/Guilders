import { ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { inputTriggerStyles } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddCategory, useCategories } from "@/lib/queries/useCategories";
import { cn } from "@/lib/utils";
import {
  buildCategoryLookup,
  flattenCategoryTree,
  type CategoryFlatItem,
} from "@/lib/utils/category-tree";

import { CategoryColorIcon } from "./category-color-icon";

type CategorySelectorProps = {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** When set, only categories with this classification are shown. Use with transaction amount: positive → income, negative → expense. */
  classification?: "income" | "expense";
};

export function CategorySelector({
  value,
  onChange,
  disabled,
  placeholder = "Select category",
  className,
  classification,
}: CategorySelectorProps) {
  const { data: categoriesTree, isLoading } = useCategories();
  const { mutate: addCategory, isPending: isCreating } = useAddCategory();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const categoryOptions = useMemo(() => {
    const flat = flattenCategoryTree(categoriesTree ?? [], { withDepth: true });
    if (classification == null) return flat;
    return flat.filter((c) => c.classification === classification);
  }, [categoriesTree, classification]);
  const categoryLookup = useMemo(() => buildCategoryLookup(categoriesTree ?? []), [categoriesTree]);
  const selectedCategory = value != null ? categoryLookup.get(value) : undefined;

  const trimmedSearch = search.trim();
  const canCreate =
    trimmedSearch.length > 0 &&
    !categoryOptions.some((c) => c.name.toLowerCase() === trimmedSearch.toLowerCase());

  const handleCreateCategory = () => {
    if (!trimmedSearch) return;
    addCategory(
      { name: trimmedSearch, classification: classification ?? "expense" },
      {
        onSuccess: (createdCategory) => {
          onChange(createdCategory.id);
          setSearch("");
          setOpen(false);
        },
      },
    );
  };

  const renderOption = (category: CategoryFlatItem) => {
    const depth = category.depth ?? 0;

    return (
      <CommandItem
        key={category.id}
        value={category.name}
        onSelect={() => {
          onChange(category.id);
          setOpen(false);
          setSearch("");
        }}
      >
        <span className="flex items-center gap-2 truncate" style={{ marginLeft: depth * 12 }}>
          <CategoryColorIcon category={category} size="lg" />
          <span className="truncate">{category.name}</span>
        </span>
      </CommandItem>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            inputTriggerStyles,
            "font-normal hover:bg-card hover:text-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {selectedCategory && (
              <CategoryColorIcon category={selectedCategory} size="lg" className="shrink-0" />
            )}
            <span className="truncate">{selectedCategory?.name || placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) max-h-[min(400px,80vh)] p-0"
        align="start"
      >
        <Command shouldFilter>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search categories..."
            disabled={disabled || isCreating}
          />
          <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden">
            <CommandEmpty className="p-2">
              {canCreate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleCreateCategory}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add "{trimmedSearch}"
                </Button>
              ) : (
                "No categories found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <CommandItem disabled>Loading categories...</CommandItem>
              ) : (
                categoryOptions.map(renderOption)
              )}
              {canCreate && (
                <CommandItem value={`add-${trimmedSearch}`} onSelect={handleCreateCategory}>
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add "{trimmedSearch}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
