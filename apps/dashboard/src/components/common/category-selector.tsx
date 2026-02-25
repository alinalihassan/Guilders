"use client";

import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddCategory, useCategories } from "@/lib/queries/useCategories";
import { cn } from "@/lib/utils";

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
  const { data: categories, isLoading } = useCategories();
  const { mutate: addCategory, isPending: isCreating } = useAddCategory();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const categoryOptions = useMemo(
    () => (categories ?? []).toSorted((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );
  const selectedCategory = categoryOptions.find((category) => category.id === value);

  const trimmedSearch = search.trim();
  const canCreate =
    trimmedSearch.length > 0 &&
    !categoryOptions.some((category) => category.name.toLowerCase() === trimmedSearch.toLowerCase());

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">{selectedCategory?.name || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search categories..."
            disabled={disabled || isCreating}
          />
          <CommandList>
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
                categoryOptions.map((category) => (
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
                      className={cn("mr-2 h-4 w-4", value === category.id ? "opacity-100" : "opacity-0")}
                    />
                    {category.name}
                  </CommandItem>
                ))
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
