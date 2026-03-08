import { Check, ChevronsUpDown, Loader2, Plus, type LucideIcon } from "lucide-react";
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
import { getCategoryIcon } from "@/lib/utils/category-icons";

type CategorySelectorProps = {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function CategorySelector({
  value,
  onChange,
  disabled,
  placeholder = "Select category",
  className,
}: CategorySelectorProps) {
  const { data: categoriesTree, isLoading } = useCategories();
  const { mutate: addCategory, isPending: isCreating } = useAddCategory();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const categoryOptions = useMemo(
    () => flattenCategoryTree(categoriesTree ?? [], { withDepth: true }),
    [categoriesTree],
  );
  const categoryLookup = useMemo(
    () => buildCategoryLookup(categoriesTree ?? []),
    [categoriesTree],
  );
  const selectedCategory = value != null ? categoryLookup.get(value) : undefined;

  const trimmedSearch = search.trim();
  const canCreate =
    trimmedSearch.length > 0 &&
    !categoryOptions.some(
      (c) => c.name.toLowerCase() === trimmedSearch.toLowerCase(),
    );

  const handleCreateCategory = () => {
    if (!trimmedSearch) return;
    addCategory(
      { name: trimmedSearch },
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
    const color = category.color ?? "#64748b";
    const Icon = getCategoryIcon(category.icon ?? undefined);
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
        <Check
          className={cn(
            "mr-2 h-4 w-4 shrink-0",
            value === category.id ? "opacity-100" : "opacity-0",
          )}
        />
        <span
          className="flex items-center gap-2 truncate"
          style={{ marginLeft: depth * 12 }}
        >
          <span
            className="h-4 w-4 shrink-0 rounded-full border border-border"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
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
          {selectedCategory && (
            <span
              className="mr-2 h-3 w-3 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: selectedCategory.color ?? "#64748b" }}
              aria-hidden
            />
          )}
          <span className="truncate">{selectedCategory?.name || placeholder}</span>
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
